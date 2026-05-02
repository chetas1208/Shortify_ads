import { spawn } from "node:child_process";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import { env } from "./env";
import type {
  AdjustedChunkResult,
  ChunkInfo,
  ContextExtractionResult,
  ProcessedVideoResult,
  VideoMetadata
} from "./job-types";
import { storeProcessedVideoMemory } from "./hydradb";
import { logger } from "./logger";
import { deleteR2Objects, putFileToR2 } from "./r2";

const workDir = "/tmp/matcha-shorts";
const ffmpegBinary = ffmpegPath || "ffmpeg";
const ffprobeBinary = ffprobe.path || "ffprobe";

type MediaProbeOutput = {
  format?: {
    bit_rate?: string;
    duration?: string;
  };
  streams?: Array<{
    bit_rate?: string;
    codec_type?: string;
    duration?: string;
    height?: number;
    width?: number;
  }>;
};

type MediaCommandResult = {
  stderr: string;
  stdout: string;
};

function contentTypeForPath(path: string) {
  const extension = extname(path).toLowerCase();
  if (extension === ".mp4") {
    return "video/mp4";
  }

  if (extension === ".mov") {
    return "video/quicktime";
  }

  return "application/octet-stream";
}

function maxVideoBytes(maxMb: number) {
  return maxMb * 1024 * 1024;
}

function chunkKey(jobId: string, fileName: string) {
  return `jobs/${jobId}/chunks/${fileName}`;
}

function derivedKey(jobId: string, fileName: string) {
  return `jobs/${jobId}/derived/${fileName}`;
}

function originalKey(jobId: string, sourcePath: string) {
  const extension = extname(sourcePath) || ".mp4";
  return `jobs/${jobId}/original/source${extension}`;
}

function processingPath(jobId: string) {
  return join(workDir, "jobs", jobId, "derived", "processing.mp4");
}

function chunkDir(jobId: string) {
  return join(workDir, "jobs", jobId, "chunks");
}

function splitArgs(chunkSeconds: number, inputPath: string, outputDir: string) {
  return [
    "-y",
    "-i",
    inputPath,
    "-map",
    "0",
    "-c",
    "copy",
    "-f",
    "segment",
    "-segment_time",
    String(chunkSeconds),
    "-reset_timestamps",
    "1",
    join(outputDir, "chunk-%03d.mp4")
  ];
}

function transcodeArgs(inputPath: string, outputPath: string, crf: number, maxWidth?: number) {
  const args = [
    "-y",
    "-i",
    inputPath,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    String(crf),
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-force_key_frames",
    `expr:gte(t,n_forced*${env.TARGET_CHUNK_SECONDS})`,
    "-c:a",
    "aac",
    "-b:a",
    "128k"
  ];

  if (maxWidth) {
    args.push("-vf", `scale=min(${maxWidth}\\,iw):-2`);
  }

  args.push(outputPath);
  return args;
}

async function runMediaCommand(command: string, args: string[]): Promise<MediaCommandResult> {
  logger.info("Running media command", { command, args });

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      logger.error("Media command failed", {
        command,
        args,
        code,
        stderr: stderr.slice(-4000)
      });
      reject(new Error(`${command} exited with ${code}: ${stderr.slice(-4000)}`));
    });
  });
}

async function replaceFile(sourcePath: string, destinationPath: string) {
  await rm(destinationPath, { force: true });
  await rename(sourcePath, destinationPath);
}

export async function getVideoMetadata(inputPath: string): Promise<VideoMetadata> {
  const [fileStats, probe] = await Promise.all([
    stat(inputPath),
    runMediaCommand(ffprobeBinary, [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      inputPath
    ])
  ]);

  const parsed = JSON.parse(probe.stdout) as MediaProbeOutput;
  const videoStream = parsed.streams?.find((stream) => stream.codec_type === "video");
  const durationSec = Number(videoStream?.duration ?? parsed.format?.duration ?? 0);
  const bitrate = Number(videoStream?.bit_rate ?? parsed.format?.bit_rate ?? 0);

  return {
    durationSec: Number.isFinite(durationSec) ? durationSec : 0,
    fileSizeBytes: fileStats.size,
    width: videoStream?.width ?? null,
    height: videoStream?.height ?? null,
    bitrate: Number.isFinite(bitrate) && bitrate > 0 ? bitrate : null
  };
}

export function shouldPreprocess(
  metadata: VideoMetadata,
  limits: { maxMb: number; maxSeconds: number }
) {
  return (
    metadata.fileSizeBytes > maxVideoBytes(limits.maxMb) ||
    metadata.durationSec > limits.maxSeconds
  );
}

export async function transcodeForProcessing(inputPath: string, outputPath: string) {
  await mkdir(dirname(outputPath), { recursive: true });
  await runMediaCommand(ffmpegBinary, transcodeArgs(inputPath, outputPath, env.FFMPEG_CRF_DEFAULT));
  return outputPath;
}

export async function splitIntoChunks(
  inputPath: string,
  outputDir: string,
  chunkSeconds: number
): Promise<ChunkInfo[]> {
  await mkdir(outputDir, { recursive: true });
  await runMediaCommand(ffmpegBinary, splitArgs(chunkSeconds, inputPath, outputDir));

  const files = (await readdir(outputDir))
    .filter((fileName) => fileName.endsWith(".mp4"))
    .sort((left, right) => left.localeCompare(right));

  if (files.length === 0) {
    throw new Error("Chunking produced no output files");
  }

  let nextStartSec = 0;

  const chunks: ChunkInfo[] = [];
  for (const [index, fileName] of files.entries()) {
    const localPath = join(outputDir, fileName);
    const metadata = await getVideoMetadata(localPath);
    chunks.push({
      index,
      fileName,
      localPath,
      startSec: nextStartSec,
      durationSec: metadata.durationSec,
      fileSizeBytes: metadata.fileSizeBytes,
      metadata
    });
    nextStartSec += metadata.durationSec;
  }

  return chunks;
}

export async function enforceChunkSizeLimit(
  chunkPath: string,
  maxMb: number
): Promise<AdjustedChunkResult> {
  const maxBytes = maxVideoBytes(maxMb);
  let currentMetadata = await getVideoMetadata(chunkPath);

  if (currentMetadata.fileSizeBytes <= maxBytes) {
    return {
      fileSizeBytes: currentMetadata.fileSizeBytes,
      localPath: chunkPath,
      metadata: currentMetadata,
      strategy: "original"
    };
  }

  const strategies = [
    { crf: 23, label: "crf_23" },
    { crf: 25, label: "crf_25" },
    { crf: 24, label: "scale_1280_crf_24", maxWidth: 1280 }
  ];

  let finalResult: AdjustedChunkResult | null = null;

  for (const strategy of strategies) {
    logger.info("Retrying chunk compression", {
      chunkPath,
      fileSizeBytes: currentMetadata.fileSizeBytes,
      strategy: strategy.label
    });

    const tempOutput = chunkPath.replace(/\.mp4$/i, `-${strategy.label}.mp4`);
    await runMediaCommand(
      ffmpegBinary,
      transcodeArgs(chunkPath, tempOutput, strategy.crf, strategy.maxWidth)
    );

    const adjustedMetadata = await getVideoMetadata(tempOutput);
    finalResult = {
      fileSizeBytes: adjustedMetadata.fileSizeBytes,
      localPath: tempOutput,
      metadata: adjustedMetadata,
      strategy: strategy.label
    };

    await replaceFile(tempOutput, chunkPath);
    currentMetadata = await getVideoMetadata(chunkPath);

    if (currentMetadata.fileSizeBytes <= maxBytes) {
      return {
        fileSizeBytes: currentMetadata.fileSizeBytes,
        localPath: chunkPath,
        metadata: currentMetadata,
        strategy: strategy.label
      };
    }
  }

  return {
    fileSizeBytes: currentMetadata.fileSizeBytes,
    localPath: chunkPath,
    metadata: currentMetadata,
    strategy: finalResult?.strategy ?? "fallback_failed"
  };
}

export async function uploadOriginalToR2(localPath: string, key: string) {
  return putFileToR2({
    key,
    path: localPath,
    mimeType: contentTypeForPath(localPath)
  });
}

export async function uploadChunkToR2(localPath: string, key: string) {
  return putFileToR2({
    key,
    path: localPath,
    mimeType: contentTypeForPath(localPath)
  });
}

export async function cleanupTempMediaObjects(keys: string[]) {
  await deleteR2Objects(keys);
}

export async function extractChunkContext(
  chunk: ChunkInfo
): Promise<ContextExtractionResult> {
  const endSec = chunk.startSec + chunk.durationSec;
  const visualSummary = chunk.metadata.width && chunk.metadata.height
    ? `${chunk.metadata.width}x${chunk.metadata.height} video chunk`
    : "Video chunk";

  return {
    chunkIndex: chunk.index,
    startSec: chunk.startSec,
    endSec,
    summary: `Chunk ${chunk.index + 1} covers ${Math.round(chunk.durationSec)} seconds and is ready for downstream clip discovery.`,
    topics: ["video", "preprocessed"],
    entities: [],
    editingSignals: [
      chunk.durationSec >= env.TARGET_CHUNK_SECONDS ? "full_chunk_window" : "short_tail_chunk"
    ],
    transcriptSummary: "Transcript extraction placeholder for this chunk.",
    visualSummary
  };
}

export async function storeVideoContextMemory(params: {
  aggregateSummary: string;
  chunkSummaries: ContextExtractionResult[];
  jobId: string;
  originalVideoUrl?: string;
  r2Key: string;
  sourceType: string;
  tempChunkKeys: string[];
  userId: string;
}) {
  return storeProcessedVideoMemory({
    userId: params.userId,
    originalVideoUrl: params.originalVideoUrl,
    r2Key: params.r2Key,
    tempChunkKeys: params.tempChunkKeys,
    aggregateSummary: params.aggregateSummary,
    chunkSummaries: params.chunkSummaries,
    sourceType: params.sourceType,
    jobId: params.jobId
  });
}

export async function preprocessVideoForJob(input: {
  jobId: string;
  sourcePath: string;
  sourceType: string;
  userId: string;
}): Promise<ProcessedVideoResult> {
  const tempDerivedKeys: string[] = [];
  const tempChunkKeys: string[] = [];

  try {
    const originalUpload = await uploadOriginalToR2(
      input.sourcePath,
      originalKey(input.jobId, input.sourcePath)
    );
    const originalMetadata = await getVideoMetadata(input.sourcePath);

    const preprocessed = shouldPreprocess(originalMetadata, {
      maxMb: env.MAX_VIDEO_PREPROCESS_MB,
      maxSeconds: env.MAX_VIDEO_SECONDS_BEFORE_CHUNKING
    });

    const requiresMp4Normalization = extname(input.sourcePath).toLowerCase() !== ".mp4";
    const processedInputPath = preprocessed || requiresMp4Normalization
      ? await transcodeForProcessing(input.sourcePath, processingPath(input.jobId))
      : input.sourcePath;

    if (preprocessed || requiresMp4Normalization) {
      const processingMasterKey = derivedKey(input.jobId, basename(processedInputPath));
      await uploadChunkToR2(processedInputPath, processingMasterKey);
      tempDerivedKeys.push(processingMasterKey);
    }

    const rawChunks = await splitIntoChunks(
      processedInputPath,
      chunkDir(input.jobId),
      env.TARGET_CHUNK_SECONDS
    );

    const chunks: ChunkInfo[] = [];
    for (const chunk of rawChunks) {
      const adjusted = await enforceChunkSizeLimit(chunk.localPath, env.MAX_VIDEO_PREPROCESS_MB);
      chunks.push({
        ...chunk,
        localPath: adjusted.localPath,
        fileSizeBytes: adjusted.fileSizeBytes,
        metadata: adjusted.metadata,
        durationSec: adjusted.metadata.durationSec
      });
    }

    const tempChunkUploads: ProcessedVideoResult["tempChunkUploads"] = [];

    for (const chunk of chunks) {
      const key = chunkKey(input.jobId, chunk.fileName);
      const upload = await uploadChunkToR2(chunk.localPath, key);
      tempChunkKeys.push(upload.key);
      tempChunkUploads.push({
        key: upload.key,
        url: upload.url,
        chunkIndex: chunk.index
      });
    }

    const chunkContexts = await Promise.all(chunks.map((chunk) => extractChunkContext(chunk)));
    const aggregateSummary = chunkContexts.map((chunk) => chunk.summary).join(" ");

    await storeVideoContextMemory({
      aggregateSummary,
      chunkSummaries: chunkContexts,
      jobId: input.jobId,
      originalVideoUrl: originalUpload.url,
      r2Key: originalUpload.key,
      sourceType: input.sourceType,
      tempChunkKeys,
      userId: input.userId
    });

    return {
      aggregateSummary,
      chunkContexts,
      chunks,
      originalUpload,
      originalMetadata,
      processedInputPath,
      preprocessed,
      tempChunkKeys,
      tempDerivedKeys,
      tempChunkUploads
    };
  } catch (error) {
    const partialKeys = [...tempDerivedKeys, ...tempChunkKeys];
    if (partialKeys.length > 0) {
      try {
        await cleanupTempMediaObjects(partialKeys);
      } catch (cleanupError) {
        logger.warn("Failed to cleanup temp S3 objects after preprocessing failure", {
          cleanupError:
            cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
          jobId: input.jobId,
          partialKeys
        });
      }
    }

    throw error;
  }
}
