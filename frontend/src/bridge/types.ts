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
  steps: StepResult[];
  error?: string;
  warnings?: string[];
}

export interface Progress {
  opId: string;
  step: number;
  total: number;
  name: string;
  kind: string;
  done: boolean;
}
