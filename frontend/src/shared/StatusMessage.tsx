import type { ReactNode } from "react";
import { tv } from "tailwind-variants";

// One status-row recipe replaces the half-dozen near-duplicate status styles a
// growing app accumulates. Tone is the only knob.
const status = tv({
  base: "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
  variants: {
    tone: {
      neutral: "border-border bg-surface-muted text-neutral-700",
      success: "border-green-200 bg-green-50 text-green-800",
      warning: "border-amber-200 bg-amber-50 text-amber-800",
      error: "border-red-200 bg-red-50 text-red-800",
      info: "border-blue-200 bg-blue-50 text-blue-800",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type StatusTone = "neutral" | "success" | "warning" | "error" | "info";

export interface StatusMessageProps {
  tone?: StatusTone;
  children: ReactNode;
}

export function StatusMessage({ tone, children }: StatusMessageProps) {
  // <output> has an implicit ARIA role of "status" (a polite live region) —
  // the right semantic element for an action's result message.
  return <output className={status({ tone })}>{children}</output>;
}
