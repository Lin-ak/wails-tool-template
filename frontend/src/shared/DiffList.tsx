import type { DiffEntry } from "../bridge/types";

// The preflight diff (current → planned per field), shown inside the confirm
// dialog before a write so the user approves exactly what will change. Entries
// outside the write whitelist (allowed=false) are highlighted — the apply
// should already be blocked when any exist.
export function DiffList({
  diff,
  emptyLabel = "The new configuration will be written.",
}: {
  diff: DiffEntry[];
  emptyLabel?: string;
}) {
  if (diff.length === 0) {
    return <p className="m-0">{emptyLabel}</p>;
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {diff.map((entry) => (
        <li key={entry.field} className="flex justify-between gap-3">
          <span className={entry.allowed ? "text-neutral-500" : "text-red-700"}>
            {entry.label || entry.field}
            {entry.allowed ? "" : " (not whitelisted)"}
          </span>
          <span className="font-mono text-neutral-800">
            {entry.current || "—"} → {entry.planned || "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}
