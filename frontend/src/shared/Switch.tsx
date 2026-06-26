import type { ReactNode } from "react";
import { Switch as AriaSwitch } from "react-aria-components";

// A toggle switch. RAC renders a native checkbox with role="switch" and exposes
// data-selected / data-disabled / data-focus-visible on the Switch element; the
// track + thumb are styled via group-data-[...] variants. Controlled
// (isSelected/onChange); in an RHF form drive it through a <Controller>.
export function Switch(props: {
  name?: string;
  isSelected: boolean;
  onChange: (value: boolean) => void;
  isDisabled?: boolean;
  "aria-label"?: string;
  children?: ReactNode;
}) {
  return (
    <AriaSwitch
      name={props.name}
      isSelected={props.isSelected}
      onChange={props.onChange}
      isDisabled={props.isDisabled}
      aria-label={props["aria-label"]}
      className="group inline-flex items-center gap-2 text-sm text-neutral-800 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
    >
      <span className="flex h-5 w-9 shrink-0 items-center rounded-full bg-neutral-300 px-0.5 transition-colors group-data-[selected]:bg-brand-500 group-data-[focus-visible]:ring-2 group-data-[focus-visible]:ring-brand-500/40">
        <span className="size-4 rounded-full bg-white shadow transition-transform group-data-[selected]:translate-x-4" />
      </span>
      {props.children}
    </AriaSwitch>
  );
}
