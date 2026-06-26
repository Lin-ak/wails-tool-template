import { ToggleButton, ToggleButtonGroup } from "react-aria-components";

// A single-select segmented control built on RAC ToggleButtonGroup. Renders as a
// radiogroup (arrow-key navigable) and always keeps one option selected.
export function SegmentedControl<T extends string>(props: {
  "aria-label"?: string;
  selectedKey: T;
  onSelectionChange: (key: T) => void;
  items: { id: T; label: string }[];
}) {
  return (
    <ToggleButtonGroup
      aria-label={props["aria-label"]}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[props.selectedKey]}
      onSelectionChange={(keys) => {
        const key = [...keys][0];
        if (key !== undefined) {
          props.onSelectionChange(String(key) as T);
        }
      }}
      className="inline-flex rounded-md border border-border bg-surface-muted p-0.5"
    >
      {props.items.map((item) => (
        <ToggleButton
          key={item.id}
          id={item.id}
          className="rounded px-3 py-1 text-sm text-neutral-600 outline-none transition-colors data-[selected]:bg-surface data-[selected]:text-neutral-900 data-[selected]:shadow-sm data-[focus-visible]:ring-2 data-[focus-visible]:ring-brand-500/40"
        >
          {item.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
