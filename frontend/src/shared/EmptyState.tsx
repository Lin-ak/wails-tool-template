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
        <div className="text-neutral-300">{icon}</div>
      ) : null}
      <p className="text-sm font-medium text-neutral-600">{title}</p>
      {description ? (
        <p className="max-w-xs text-xs text-neutral-400">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
