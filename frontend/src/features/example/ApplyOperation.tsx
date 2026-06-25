import { Button } from "react-aria-components";
import { tv } from "tailwind-variants/lite";
import { useApplyExample } from "../../bridge/queries";
import { StatusMessage } from "../../shared/StatusMessage";

const button = tv({
  base: "rounded-md px-4 py-2 text-sm font-medium outline-none data-[focus-visible]:ring-2 data-[disabled]:opacity-50",
  variants: {
    intent: {
      primary:
        "bg-brand-500 text-white data-[hovered]:bg-brand-700 data-[pressed]:bg-brand-700 data-[focus-visible]:ring-brand-500/40",
      danger:
        "border border-red-300 bg-white text-red-700 data-[hovered]:bg-red-50 data-[focus-visible]:ring-red-400/40",
    },
  },
});

const kindColor: Record<string, string> = {
  success: "text-green-700",
  already_done: "text-green-700",
  not_found: "text-amber-700",
  transient: "text-amber-700",
  canceled: "text-neutral-500",
  fatal: "text-red-700",
};

// A representative request; a real screen would collect this from a form.
const sampleRequest = { host: "10.0.0.10", port: 443, secret: "demo-secret" };

export function ApplyOperation() {
  const apply = useApplyExample();
  const pct = apply.progress
    ? Math.round((apply.progress.step / apply.progress.total) * 100)
    : 0;
  const steps = apply.data?.steps ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          className={button({ intent: "primary" })}
          isPending={apply.isPending}
          onPress={() => apply.mutate(sampleRequest)}
        >
          {apply.isPending ? "Applying…" : "Apply configuration"}
        </Button>
        {apply.isPending ? (
          <Button
            className={button({ intent: "danger" })}
            onPress={apply.cancel}
          >
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

      {steps.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {steps.map((s) => (
            <li
              key={s.name}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-neutral-700">{s.name}</span>
              <span
                className={`text-xs font-medium ${kindColor[s.kind] ?? "text-neutral-600"}`}
              >
                {s.kind}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {apply.data?.canceled ? (
        <StatusMessage tone="warning">Canceled.</StatusMessage>
      ) : apply.data && !apply.data.ok ? (
        <StatusMessage tone="error">
          {apply.data.partial ? "Partially applied: " : ""}
          {apply.data.error ?? "Failed."}
        </StatusMessage>
      ) : null}
      {apply.data?.ok ? (
        <StatusMessage tone="success">Applied.</StatusMessage>
      ) : null}
    </div>
  );
}
