import { useState } from "react";
import { useApplyExample } from "../../bridge/queries";
import { Button } from "../../shared/Button";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { ProofPanel, type ProofPanelData } from "../../shared/ProofPanel";
import { SegmentedControl } from "../../shared/SegmentedControl";
import { StatusMessage } from "../../shared/StatusMessage";
import { Switch } from "../../shared/Switch";

// A representative request; a real screen would collect this from a form.
const sampleRequest = { host: "10.0.0.10", port: 443, secret: "demo-secret" };

type EvidenceDetail = "summary" | "full";

export function ApplyOperation() {
  const apply = useApplyExample();
  const [confirmFirst, setConfirmFirst] = useState(true);
  const [evidenceDetail, setEvidenceDetail] =
    useState<EvidenceDetail>("summary");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const pct = apply.progress
    ? Math.round((apply.progress.step / apply.progress.total) * 100)
    : 0;

  const run = () => apply.mutate(sampleRequest);
  const onApplyPress = () => (confirmFirst ? setIsConfirmOpen(true) : run());

  // Build the evidence panel from the operation result. A real operation would
  // also pass Result.Output/stderr here; the sample backend only returns steps.
  const proof: ProofPanelData | null = apply.data
    ? {
        commands: apply.data.steps?.map((s) => `${s.name} → ${s.kind}`),
        error: apply.data.ok ? undefined : apply.data.error,
      }
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button isPending={apply.isPending} onPress={onApplyPress}>
          {apply.isPending ? "Applying…" : "Apply configuration"}
        </Button>
        {apply.isPending ? (
          <Button variant="secondary" onPress={apply.cancel}>
            Cancel
          </Button>
        ) : null}
        <Switch
          isSelected={confirmFirst}
          onChange={setConfirmFirst}
          aria-label="Confirm before applying"
        >
          Confirm first
        </Switch>
        <SegmentedControl<EvidenceDetail>
          aria-label="Evidence detail"
          selectedKey={evidenceDetail}
          onSelectionChange={setEvidenceDetail}
          items={[
            { id: "summary", label: "Summary" },
            { id: "full", label: "Full" },
          ]}
        />
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

      {proof ? (
        <ProofPanel proof={proof} defaultExpanded={evidenceDetail === "full"} />
      ) : null}

      {apply.data?.canceled ? (
        <StatusMessage tone="warning">Canceled.</StatusMessage>
      ) : apply.data && !apply.data.ok ? (
        <StatusMessage tone="error">
          {apply.data.partial ? "Partially applied." : "Failed."}
        </StatusMessage>
      ) : apply.data?.ok ? (
        <StatusMessage tone="success">Applied.</StatusMessage>
      ) : null}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Apply configuration?"
        confirmLabel="Apply"
        onConfirm={() => {
          setIsConfirmOpen(false);
          run();
        }}
        onCancel={() => setIsConfirmOpen(false)}
      >
        This runs the sample operation against {sampleRequest.host}.
      </ConfirmDialog>
    </div>
  );
}
