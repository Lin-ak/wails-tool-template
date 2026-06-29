import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import {
  TextField as AriaTextField,
  FieldError,
  Input,
  Label,
} from "react-aria-components";
import { tv } from "tailwind-variants/lite";

const fieldStyle = tv({ base: "flex flex-col gap-1.5" });
const labelStyle = tv({ base: "text-sm font-medium text-neutral-700" });
const inputStyle = tv({
  base: "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-neutral-900 outline-none data-[focused]:border-brand-500 data-[focused]:ring-2 data-[focused]:ring-brand-500/30 data-[invalid]:border-red-500 data-[disabled]:opacity-50",
});
const errorStyle = tv({ base: "text-xs text-red-700" });
const rowStyle = tv({ base: "flex items-stretch gap-2" });

type NativeInputProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  | "name"
  | "onChange"
  | "onBlur"
  | "type"
  | "placeholder"
  | "autoComplete"
  | "inputMode"
>;

export interface TextFieldProps extends NativeInputProps {
  label: string;
  error?: string;
  isDisabled?: boolean;
  // Initial value, applied via RAC's own uncontrolled state. RHF's defaultValues
  // don't populate a RAC-wrapped input for display, so seed the visible value
  // here too (from the same source, so display == what RHF submits).
  defaultValue?: string;
  // Optional trailing control (e.g. a Browse button) rendered beside the input.
  trailing?: ReactNode;
  className?: string;
}

// TextField wraps a RAC TextField with a label, input and field error. It
// forwards its ref so React Hook Form's register({...}) works: spread register's
// {name,onChange,onBlur,ref} directly onto it.
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      label,
      error,
      isDisabled,
      defaultValue,
      trailing,
      type = "text",
      className,
      ...inputProps
    },
    ref,
  ) {
    return (
      <AriaTextField
        className={fieldStyle({ className })}
        isInvalid={Boolean(error)}
        isDisabled={isDisabled}
        defaultValue={defaultValue}
      >
        <Label className={labelStyle()}>{label}</Label>
        <div className={rowStyle()}>
          <Input
            ref={ref}
            type={type}
            className={inputStyle()}
            {...inputProps}
          />
          {trailing}
        </div>
        <FieldError className={errorStyle()}>{error}</FieldError>
      </AriaTextField>
    );
  },
);
