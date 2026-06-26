import { useState } from "react";
import { useApplyExample } from "../../bridge/queries";
import { Button } from "../../shared/Button";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { ProofPanel, type ProofPanelData } from "../../shared/ProofPanel";
import { SegmentedControl } from "../../shared/SegmentedControl";
import { StatusMessage } from "../../shared/StatusMessage";
import { Switch } from "../../shared/Switch";

// Hosts the operation can target; the SegmentedControl picks one. A real screen
// would collect the request from a form (see ExampleForm).
const TARGETS = { staging: "10.0.0.10", production: "10.0.0.20" };
type Target = keyof typeof TARGETS;

export function ApplyOperation() {
  const apply = useApplyExample();
  const [target, setTarget] = useState<Target>("staging");
  const [confirmFirst, setConfirmFirst] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const run = () =>
    apply.mutate({ host: TARGETS[target], port: 443, secret: "demo-secret" });
  const pct = apply.progress
    ? Math.round((apply.progress.step / apply.progress.total) * 100)
    : 0;
  // Evidence of what ran; ProofPanel redacts every line before display.
  const proof: ProofPanelData | null = apply.data
    ? {
        commands: apply.data.steps?.map((s) => `${s.name} → ${s.kind}`),
        error: apply.data.ok ? undefined : apply.data.error,
      }
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl<Target>
          aria-label="Target"
          selectedKey={target}
          onSelectionChange={setTarget}
          items={[
            { id: "staging", label: "Staging" },
            { id: "production", label: "Production" },
          ]}
        />
        <Switch
          isSelected={confirmFirst}
          onChange={setConfirmFirst}
          aria-label="Confirm before applying"
        >
          Confirm first
        </Switch>
        <Button
          isPending={apply.isPending}
          onPress={() => (confirmFirst ? setIsConfirmOpen(true) : run())}
        >
          {apply.isPending ? "Applying…" : "Apply"}
        </Button>
        {apply.isPending ? (
          <Button variant="secondary" onPress={apply.cancel}>
            Cancel
          </Button>
        ) : null}
      </div>

      {apply.progress ? (
        <div>
          <div className="h-2 w-full overflow-hidden rounded bg-surface-muted">
            <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-neutral-600">
            Step {apply.progress.step}/{apply.progress.total}:{" "}
            {apply.progress.name}
          </p>
        </div>
      ) : null}

      {proof ? <ProofPanel proof={proof} /> : null}

      {apply.data?.canceled ? (
        <StatusMessage tone="warning">Canceled.</StatusMessage>
      ) : apply.data?.ok ? (
        <StatusMessage tone="success">Applied.</StatusMessage>
      ) : apply.data ? (
        <StatusMessage tone="error">Failed.</StatusMessage>
      ) : null}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={`Apply to ${target}?`}
        confirmLabel="Apply"
        variant={target === "production" ? "warning" : "info"}
        onConfirm={() => {
          setIsConfirmOpen(false);
          run();
        }}
        onCancel={() => setIsConfirmOpen(false)}
      >
        This runs the sample operation against {TARGETS[target]}.
      </ConfirmDialog>
    </div>
  );
}
