import { Fragment, useEffect } from "react";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  /** Render in the danger color (e.g. destructive actions). */
  danger?: boolean;
  /** Draw a divider above this item. */
  separatorBefore?: boolean;
  /** Greyed out and non-interactive. */
  disabled?: boolean;
}

const MENU_WIDTH = 200;
const ROW_HEIGHT = 34;
const MARGIN = 8;

// A right-click menu positioned at the cursor. Render it conditionally from the
// owning component, which holds the `{ x, y }` from the triggering event:
//
//   {menu && <ContextMenu x={menu.x} y={menu.y} items={…} onClose={() => setMenu(null)} />}
//
// A full-screen backdrop captures the next click (or Escape) to dismiss it.
export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Keep the menu fully on screen.
  const left = Math.max(
    MARGIN,
    Math.min(x, window.innerWidth - MENU_WIDTH - MARGIN),
  );
  const estHeight = items.length * ROW_HEIGHT + MARGIN;
  const top = Math.max(
    MARGIN,
    Math.min(y, window.innerHeight - estHeight - MARGIN),
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: invisible dismiss backdrop; Escape also closes
    <div
      className="fixed inset-0 z-40"
      onMouseDown={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        role="menu"
        className="absolute rounded-md border border-border bg-surface py-1 text-[13px] shadow-xl"
        style={{ left, top, minWidth: MENU_WIDTH }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {items.map((it) => (
          <Fragment key={it.label}>
            {it.separatorBefore && <div className="my-1 h-px bg-border" />}
            <button
              type="button"
              role="menuitem"
              disabled={it.disabled}
              className={`block w-full px-3 py-1.5 text-left outline-none hover:bg-brand-500/10 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent ${
                it.danger ? "text-red-600" : "text-neutral-700"
              }`}
              onClick={() => {
                if (it.disabled) return;
                it.onSelect();
                onClose();
              }}
            >
              {it.label}
            </button>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
