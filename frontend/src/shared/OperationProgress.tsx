import type { Progress } from "../bridge/types";

// Streamed progress for an in-flight apply: a real progressbar (role +
// aria-value*) plus the step line in an <output> — an implicit polite live
// region (same pattern as StatusMessage) — so screen readers hear each step,
// not just the final status. Render it only while the operation is pending;
// after settle the ProofPanel/StatusMessage carry the outcome.
export function OperationProgress({ progress }: { progress: Progress }) {
  const pct = Math.round((progress.step / progress.total) * 100);
  return (
    <div>
      <div
        role="progressbar"
        aria-label="Operation progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 w-full overflow-hidden rounded bg-surface-muted"
      >
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <output className="mt-1 block text-xs text-muted-foreground">
        Step {progress.step}/{progress.total}: {progress.name}
      </output>
    </div>
  );
}
