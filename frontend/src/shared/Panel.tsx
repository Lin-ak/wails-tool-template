import type { ReactNode } from "react";
import { tv } from "tailwind-variants";

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
  children: ReactNode;
}

export function Panel({ title, tone, children }: PanelProps) {
  return (
    <section className={panel({ tone })}>
      {title ? (
        <h2 className="mb-3 text-sm font-medium text-neutral-700">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}
