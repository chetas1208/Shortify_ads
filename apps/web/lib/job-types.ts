export const jobKinds = ["text_to_video", "video_to_shorts", "multimodal_edit"] as const;
export const jobStages = [
  "received",
  "uploading",
  "preprocessing",
  "transcribing",
  "analyzing",
  "ranking",
  "generating",
  "stitching",
  "finalizing",
  "completed",
  "failed"
] as const;
export const outputPlatforms = ["youtube_shorts", "instagram_reels", "tiktok"] as const;

export type JobKind = (typeof jobKinds)[number];
export type JobStage = (typeof jobStages)[number];
export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type AssetType = "video" | "image" | "url";
export type AssetKind = "upload" | "chunk" | "output" | "reference";
export type OutputPlatform = (typeof outputPlatforms)[number];

export type MediaAsset = {
  id: string;
  kind: AssetKind;
  type: AssetType;
  r2Key?: string;
  url?: string;
  mimeType?: string | null;
  fileName?: string | null;
  bytes?: number | null;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
};

export type VideoMetadata = {
  durationSec: number;
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
  bitrate: number | null;
};

export type ChunkInfo = {
  index: number;
  fileName: string;
  localPath: string;
  startSec: number;
  durationSec: number;
  fileSizeBytes: number;
  metadata: VideoMetadata;
};

export type AdjustedChunkResult = {
  fileSizeBytes: number;
  localPath: string;
  metadata: VideoMetadata;
  strategy: string;
};

export type ContextExtractionResult = {
  chunkIndex: number;
  startSec: number;
  endSec: number;
  summary: string;
  topics: string[];
  entities: string[];
  editingSignals: string[];
  transcriptSummary: string;
  visualSummary: string;
};

export type ProcessedVideoResult = {
  aggregateSummary: string;
  chunkContexts: ContextExtractionResult[];
  chunks: ChunkInfo[];
  originalUpload: {
    key: string;
    url?: string;
  };
  originalMetadata: VideoMetadata;
  processedInputPath: string;
  preprocessed: boolean;
  tempChunkKeys: string[];
  tempDerivedKeys: string[];
  tempChunkUploads: Array<{
    key: string;
    url: string;
    chunkIndex: number;
  }>;
};

export type ShortCandidate = {
  id: string;
  sourceAssetId?: string;
  title: string;
  hook: string;
  score: number;
  startSeconds?: number;
  endSeconds?: number;
  transcript?: string;
  keyframeUrls?: string[];
};

export type GeneratedOutput = {
  id: string;
  title: string;
  hook?: string;
  score?: number;
  url?: string;
  gmiTaskId?: string;
  caption?: string;
  platform: OutputPlatform;
  r2Key?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
};

export type JobInput = {
  text?: string;
  youtubeUrl?: string;
  sourceUrl?: string;
  assetIds: string[];
  assets?: MediaAsset[];
  platform: OutputPlatform;
};

export type JobRecord = {
  id: string;
  userId: string;
  threadId?: string;
  kind: JobKind;
  stage: JobStage;
  status: JobStatus;
  progress: number;
  input: JobInput;
  plan?: Record<string, unknown>;
  result?: {
    outputs?: GeneratedOutput[];
    [key: string]: unknown;
  };
  error?: string;
  attempts: number;
  nextRunAt: string;
  startedAt?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type UserMemory = {
  userId: string;
  style?: string;
  durationSeconds?: number;
  captionTone?: string;
  acceptedOutputs?: string[];
  rejectedOutputs?: string[];
  raw?: unknown;
};

export type JobProgress = {
  jobId: string;
  status: JobStatus;
  stage: JobStage;
  progress: number;
  message?: string;
  updatedAt: string;
};
