import type { ShortCandidate } from "./job-types";

export function localScoreCandidates(candidates: ShortCandidate[]) {
  return candidates
    .map((candidate, index) => ({
      ...candidate,
      score:
        candidate.score ||
        Math.max(50, 95 - index * 6 + (candidate.transcript?.includes("?") ? 4 : 0))
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
