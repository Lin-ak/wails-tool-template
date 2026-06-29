import { forwardRef, type TextareaHTMLAttributes } from "react";
import {
  TextField as AriaTextField,
  FieldError,
  Label,
  TextArea,
} from "react-aria-components";
import { tv } from "tailwind-variants/lite";

const fieldStyle = tv({ base: "flex flex-col gap-1.5" });
const labelStyle = tv({ base: "text-sm font-medium text-neutral-700" });
const areaStyle = tv({
  base: "w-full resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-neutral-900 outline-none data-[focused]:border-brand-500 data-[focused]:ring-2 data-[focused]:ring-brand-500/30 data-[invalid]:border-red-500 data-[disabled]:opacity-50",
});
const errorStyle = tv({ base: "text-xs text-red-700" });

type NativeProps = Pick<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "name" | "onChange" | "onBlur" | "placeholder" | "rows"
>;

export interface TextAreaFieldProps extends NativeProps {
  label: string;
  error?: string;
  isDisabled?: boolean;
}

// The multi-line counterpart to TextField (config blocks, PEM/keys, JSON, logs),
// built on RAC TextField + TextArea. Like TextField it forwards its ref so React
// Hook Form's register({...}) drives it uncontrolled.
export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  TextAreaFieldProps
>(function TextAreaField(
  { label, error, isDisabled, rows = 4, ...props },
  ref,
) {
  return (
    <AriaTextField
      className={fieldStyle()}
      isInvalid={Boolean(error)}
      isDisabled={isDisabled}
    >
      <Label className={labelStyle()}>{label}</Label>
      <TextArea ref={ref} rows={rows} className={areaStyle()} {...props} />
      <FieldError className={errorStyle()}>{error}</FieldError>
    </AriaTextField>
  );
});
