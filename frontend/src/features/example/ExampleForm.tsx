import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Form } from "react-aria-components";
import { useForm } from "react-hook-form";
import { errorMessage } from "../../bridge/errorMessage";
import { useApplyExample, usePlanExample } from "../../bridge/queries";
import type { ExampleRequest } from "../../bridge/types";
import { Button } from "../../shared/Button";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { DiffList } from "../../shared/DiffList";
import { FieldGroup } from "../../shared/FieldGroup";
import { ProofPanel, type ProofPanelData } from "../../shared/ProofPanel";
import { SensitiveTextField } from "../../shared/SensitiveTextField";
import { StatusMessage } from "../../shared/StatusMessage";
import { sanitizeSensitiveText } from "../../shared/sensitiveText";
import { TextField } from "../../shared/TextField";
import { type ExampleInput, type ExampleOutput, exampleSchema } from "./schema";

// The full safe-write loop for one feature: submit → PLAN (read current state,
// whitelisted diff) → CONFIRM (DiffList shows exactly what will change) →
// APPLY (streamed progress, cancellable) → read-back verification → PROOF.
// Copy this shape per real feature; the bare single-command form it replaced
// was just `run.mutate(values)` on submit.
export function ExampleForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExampleInput, unknown, ExampleOutput>({
    resolver: zodResolver(exampleSchema),
  });
  const plan = usePlanExample();
  const apply = useApplyExample();
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [pendingReq, setPendingReq] = useState<ExampleRequest | null>(null);

  const preflight = plan.data;
  const blocked = Boolean(preflight && !preflight.error && !preflight.canWrite);

  const onSubmit = (values: ExampleOutput) => {
    apply.reset();
    setPendingReq(values);
    plan.mutate(values, {
      onSuccess: (pf) => {
        if (!pf.error && pf.canWrite && pf.hasWriteDiff) {
          setConfirmOpen(true);
        }
      },
    });
  };

  const runApply = () => {
    setConfirmOpen(false);
    if (pendingReq) {
      apply.mutate(pendingReq);
    }
  };

  const pct = apply.progress
    ? Math.round((apply.progress.step / apply.progress.total) * 100)
    : 0;
  // Evidence of what ran + what the verify step read back afterwards.
  const proof: ProofPanelData | null = apply.data
    ? {
        commands: apply.data.steps?.map((s) => `${s.name} → ${s.kind}`),
        readback: Object.entries(apply.data.readback ?? {}).map(
          ([field, value]) => `${field}: ${value}`,
        ),
        error: apply.data.ok ? undefined : apply.data.error,
      }
    : null;

  return (
    <Form
      className="flex max-w-md flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <FieldGroup title="Target">
        <TextField
          label="Host"
          error={errors.host?.message}
          {...register("host")}
        />
        <TextField
          label="Port"
          type="number"
          inputMode="numeric"
          error={errors.port?.message}
          {...register("port")}
        />
      </FieldGroup>
      <SensitiveTextField
        label="Secret"
        error={errors.secret?.message}
        {...register("secret")}
      />

      <Button type="submit" isPending={plan.isPending}>
        {plan.isPending ? "Checking…" : "Preview changes"}
      </Button>

      {plan.isError ? (
        <StatusMessage tone="error">
          {sanitizeSensitiveText(errorMessage(plan.error))}
        </StatusMessage>
      ) : preflight?.error ? (
        <StatusMessage tone="error">
          {sanitizeSensitiveText(preflight.error)}
        </StatusMessage>
      ) : blocked ? (
        <StatusMessage tone="warning">
          {preflight?.message} ({preflight?.unexpectedDiffFields.join(", ")})
        </StatusMessage>
      ) : preflight && !preflight.hasWriteDiff ? (
        <StatusMessage tone="success">
          Already consistent — nothing to write.
        </StatusMessage>
      ) : null}

      {apply.isPending ? (
        <div className="flex flex-col gap-2">
          {apply.progress ? (
            <div>
              <div className="h-2 w-full overflow-hidden rounded bg-surface-muted">
                <div
                  className="h-full bg-brand-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-neutral-600">
                Step {apply.progress.step}/{apply.progress.total}:{" "}
                {apply.progress.name}
              </p>
            </div>
          ) : null}
          <Button variant="secondary" onPress={apply.cancel}>
            Cancel
          </Button>
        </div>
      ) : null}

      {apply.isError ? (
        <StatusMessage tone="error">
          {sanitizeSensitiveText(errorMessage(apply.error))}
        </StatusMessage>
      ) : apply.data?.canceled ? (
        <StatusMessage tone="warning">Canceled.</StatusMessage>
      ) : apply.data?.ok ? (
        <StatusMessage tone="success">
          Applied and verified by read-back.
        </StatusMessage>
      ) : apply.data ? (
        <StatusMessage tone="error">
          {sanitizeSensitiveText(apply.data.error) || "Failed."}
        </StatusMessage>
      ) : null}

      {proof ? <ProofPanel proof={proof} /> : null}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={preflight?.title ? `Apply: ${preflight.title}?` : "Apply?"}
        confirmLabel="Apply"
        variant="warning"
        onConfirm={runApply}
        onCancel={() => setConfirmOpen(false)}
      >
        <DiffList diff={preflight?.diff ?? []} />
      </ConfirmDialog>
    </Form>
  );
}
