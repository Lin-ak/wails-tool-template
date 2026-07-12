import type { ReactNode } from "react";

import { alertVariants } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// StatusMessage = the app's live-region status row. Visuals come from the
// shadcn/ui Alert recipe (semantic status tokens) so alerts and status rows
// stay identical; the element stays <output> — an implicit polite "status"
// live region, which role="alert" divs are not.

export type StatusTone = "neutral" | "success" | "warning" | "error" | "info";

const toneToVariant = {
  neutral: "default",
  success: "success",
  warning: "warning",
  error: "destructive",
  info: "info",
} as const;

export interface StatusMessageProps {
  tone?: StatusTone;
  children: ReactNode;
}

export function StatusMessage({
  tone = "neutral",
  children,
}: StatusMessageProps) {
  return (
    <output className={cn(alertVariants({ variant: toneToVariant[tone] }))}>
      {children}
    </output>
  );
}
