import type { ReactNode } from "react";
import { Spinner } from "./Spinner";

// A centered placeholder for the two states a data view spends time in before it
// has rows to show: loading and empty. `role="status"` lets assistive tech
// announce the transition. Pass `loading` for a spinner; otherwise pass an
// optional `icon` (and `action`) for the empty case.
export function EmptyState({
  loading,
  title,
  description,
  icon,
  action,
}: {
  loading?: boolean;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center"
    >
      {loading ? (
        <Spinner size={24} />
      ) : icon ? (
        <div className="text-muted-foreground">{icon}</div>
      ) : null}
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description ? (
        <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
