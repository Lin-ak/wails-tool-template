import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Panel keeps its historical API (title / tone / action) but is now a thin
// wrapper over the shadcn/ui Card business layer, so every panel in the app
// inherits the semantic card tokens from one place.

export interface PanelProps {
  title?: string;
  tone?: "neutral" | "brand";
  // Optional header action (a section-level button like "Refresh" / "Add"),
  // rendered on the same row as the title, right-aligned.
  action?: ReactNode;
  children: ReactNode;
}

export function Panel({ title, tone, action, children }: PanelProps) {
  const hasHeader = Boolean(title || action);
  return (
    <Card
      className={cn(tone === "brand" && "border-brand-500/40 bg-brand-surface")}
    >
      {hasHeader && (
        <CardHeader className="pb-3">
          <CardTitle>{title}</CardTitle>
          {action}
        </CardHeader>
      )}
      <CardContent className={cn(!hasHeader && "pt-4")}>{children}</CardContent>
    </Card>
  );
}
