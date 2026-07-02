import { forwardRef, type SelectHTMLAttributes, useId } from "react";
import { tv } from "tailwind-variants/lite";

const fieldStyle = tv({ base: "flex flex-col gap-1.5" });
const labelStyle = tv({ base: "text-sm font-medium text-neutral-700" });
const selectStyle = tv({
  base: "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-neutral-900 outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30 aria-[invalid=true]:border-red-500 disabled:opacity-50",
});
const errorStyle = tv({ base: "text-xs text-red-700" });

export interface SelectOption {
  value: string;
  label: string;
}

type NativeSelectProps = Pick<
  SelectHTMLAttributes<HTMLSelectElement>,
  "name" | "onChange" | "onBlur" | "defaultValue" | "disabled"
>;

export interface SelectProps extends NativeSelectProps {
  label: string;
  options: SelectOption[];
  error?: string;
}

// A dropdown built on a native <select>, so React Hook Form's register drives it
// and the value shows without the RAC controlled-input caveat (see TextField's
// defaultValue note). Mirrors TextField's label + error layout; spread register's
// {name,onChange,onBlur,ref} onto it, and pass `defaultValue` to seed the
// selection.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, options, error, ...selectProps }, ref) {
    const id = useId();
    return (
      <div className={fieldStyle()}>
        <label className={labelStyle()} htmlFor={id}>
          {label}
        </label>
        <select
          id={id}
          ref={ref}
          className={selectStyle()}
          aria-invalid={error ? true : undefined}
          {...selectProps}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error ? <span className={errorStyle()}>{error}</span> : null}
      </div>
    );
  },
);
