import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

// shadcn/ui Alert, with status variants driven by the semantic tokens
// (--success/--warning/--info/--destructive). alertVariants is exported so
// live-region components (StatusMessage's <output>) can share the exact recipe.

const alertVariants = cva(
  "flex w-full items-start gap-2 rounded-md border px-3 py-2 text-sm",
  {
    variants: {
      variant: {
        default: "border-border bg-muted text-foreground",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        info: "border-info/30 bg-info/10 text-info",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Alert, alertVariants };
