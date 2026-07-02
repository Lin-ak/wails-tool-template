// These mirror the Go types in internal/app/app.go. In a real project Wails
// generates them into wailsjs/go/models.ts — import those instead and delete
// this file.
export interface ExampleRequest {
  host: string;
  port: number;
  secret: string;
}

export interface ExampleResult {
  ok: boolean;
  kind?: string;
  output: string;
  error?: string;
  warnings?: string[];
}

export interface StepResult {
  name: string;
  kind: string;
  code: number;
  error?: string;
  durationMs: number;
}

export interface ApplyResult {
  opId: string;
  ok: boolean;
  partial: boolean;
  canceled: boolean;
  steps: StepResult[];
  // Values the verify step read back after the write (field → value); present
  // when the post-write field verification ran and passed.
  readback?: Record<string, string>;
  error?: string;
  warnings?: string[];
}

// One field's current → planned change from the preflight diff. allowed=false
// means the field is outside the write whitelist and blocks the apply.
export interface DiffEntry {
  field: string;
  label: string;
  current: string;
  planned: string;
  allowed: boolean;
}

// PlanExample's result: the inspectable "what will change" computed before a
// write (domain.Preflight flattened, plus an error channel).
export interface PreflightResult {
  title: string;
  current: Record<string, unknown>;
  planned: Record<string, unknown>;
  diff: DiffEntry[];
  allowedDiffFields: string[];
  unexpectedDiffFields: string[];
  hasWriteDiff: boolean;
  canWrite: boolean;
  message: string;
  error?: string;
}

export interface Progress {
  opId: string;
  step: number;
  total: number;
  name: string;
  kind: string;
  done: boolean;
}
