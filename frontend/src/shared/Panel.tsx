import type { ReactNode } from "react";
import { tv } from "tailwind-variants/lite";

// tailwind-variants keeps variant logic out of the JSX. Define the recipe once;
// call panel({ tone }) to get the className string.
const panel = tv({
  base: "rounded-panel border border-border bg-surface p-4",
  variants: {
    tone: {
      neutral: "",
      brand: "border-brand-500/40 bg-brand-50",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface PanelProps {
  title?: string;
  tone?: "neutral" | "brand";
  // Optional header action (a section-level button like "Refresh" / "Add"),
  // rendered on the same row as the title, right-aligned.
  action?: ReactNode;
  children: ReactNode;
}

export function Panel({ title, tone, action, children }: PanelProps) {
  return (
    <section className={panel({ tone })}>
      {action ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="m-0 text-sm font-medium text-neutral-700">{title}</h2>
          {action}
        </div>
      ) : title ? (
        <h2 className="mb-3 text-sm font-medium text-neutral-700">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}
