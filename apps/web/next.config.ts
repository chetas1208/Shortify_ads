import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    }
  },
  serverExternalPackages: [
    "ffmpeg-static",
    "ffprobe-static",
    "fluent-ffmpeg",
    "youtube-dl-exec",
    "@ffmpeg/ffmpeg",
    "@ffmpeg/util"
  ]
};

export default nextConfig;
