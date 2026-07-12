import type * as React from "react";

import { cn } from "@/lib/utils";

// shadcn/ui Table (trimmed). The container div owns horizontal overflow so wide
// content scrolls inside the card instead of the page.

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-left text-xs", className)}
        {...props}
      />
    </div>
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn(className)} {...props} />;
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("border-border/60 border-b last:border-0", className)}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td data-slot="table-cell" className={cn("py-1", className)} {...props} />
  );
}

export { Table, TableBody, TableCell, TableRow };
