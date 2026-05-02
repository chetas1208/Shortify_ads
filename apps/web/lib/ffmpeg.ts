import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { ShortCandidate } from "./job-types";
import { logger } from "./logger";

const workDir = "/tmp/matcha-shorts";

function run(command: string, args: string[]) {
  logger.info("Running media command", { command, args });

  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

export async function downloadAsset(url: string, extension = "mp4") {
  await mkdir(workDir, { recursive: true });
  const outputPath = join(workDir, `${randomUUID()}.${extension}`);

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Asset download failed: ${response.status} ${await response.text()}`);
  }

  const file = await import("node:fs").then((fs) => fs.createWriteStream(outputPath));
  await new Promise<void>((resolve, reject) => {
    response.body?.pipeTo(
      new WritableStream({
        write(chunk) {
          file.write(Buffer.from(chunk));
        },
        close() {
          file.end(resolve);
        },
        abort(error) {
          file.destroy();
          reject(error);
        }
      })
    ).catch(reject);
  });

  return outputPath;
}

export async function normalizeVerticalVideo(inputPath: string) {
  const outputPath = join(workDir, `${randomUUID()}-vertical.mp4`);
  await mkdir(dirname(outputPath), { recursive: true });

  await run("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-vf",
    "scale=1080:-2,crop=1080:1920",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-c:a",
    "aac",
    outputPath
  ]);

  return outputPath;
}

export async function downloadYoutube(url: string, cookiesPath?: string) {
  await mkdir(workDir, { recursive: true });
  const outputPath = join(workDir, `${randomUUID()}-youtube.mp4`);
  const args = [
    "-f",
    "worst[ext=mp4]/worst",
    "--merge-output-format",
    "mp4",
    "-o",
    outputPath,
    url
  ];

  if (cookiesPath) {
    args.unshift("--cookies", cookiesPath);
  }

  await run("yt-dlp", args);
  return outputPath;
}

export async function detectScenes(inputPath: string): Promise<ShortCandidate[]> {
  const outputPattern = join(workDir, `${randomUUID()}-scene-%03d.jpg`);
  await run("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-vf",
    "select='gt(scene,0.35)',showinfo",
    "-vsync",
    "vfr",
    outputPattern
  ]);

  // Hackathon-friendly approximation: seed five candidates across the video.
  // Replace with ffprobe scene timestamps when precision matters.
  return Array.from({ length: 5 }, (_, index) => {
    const startSeconds = index * 12;
    return {
      id: randomUUID(),
      title: `Candidate clip ${index + 1}`,
      hook: "Strong visual moment",
      score: 100 - index * 5,
      startSeconds,
      endSeconds: startSeconds + 12
    };
  });
}

export async function cutClip(inputPath: string, startSeconds: number, endSeconds: number) {
  const outputPath = join(workDir, `${randomUUID()}-clip.mp4`);

  await run("ffmpeg", [
    "-y",
    "-ss",
    String(startSeconds),
    "-to",
    String(endSeconds),
    "-i",
    inputPath,
    "-vf",
    "scale=1080:-2,crop=1080:1920",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-c:a",
    "aac",
    outputPath
  ]);

  return outputPath;
}
