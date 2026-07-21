import type { ScoredSubmission } from "../shared/scoring";

export interface AppHealth {
  ok: boolean;
  configured: boolean;
  mode: string;
  storage: string;
  scopes: string[];
}

export type SessionState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "anonymous"; configured: boolean }
  | { status: "authenticated"; username: string; communities: string[] };

export interface ScanResponse {
  subreddit: string;
  scannedAt: string;
  results: ScoredSubmission[];
  retention: string;
}
