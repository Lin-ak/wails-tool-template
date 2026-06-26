import { forwardRef, type InputHTMLAttributes, useState } from "react";
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
  base: "w-full rounded-md border border-border bg-surface px-3 py-2 pr-16 text-sm text-neutral-900 outline-none data-[focused]:border-brand-500 data-[focused]:ring-2 data-[focused]:ring-brand-500/30 data-[invalid]:border-red-500",
});
const errorStyle = tv({ base: "text-xs text-red-700" });
const toggleStyle = tv({
  base: "absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-xs font-medium text-neutral-500 outline-none hover:text-neutral-800 focus-visible:ring-2 focus-visible:ring-brand-500/30",
});

type NativeInputProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "onChange" | "onBlur" | "placeholder" | "autoComplete"
>;

export interface SensitiveTextFieldProps extends NativeInputProps {
  label: string;
  error?: string;
}

// A password field with a show/hide toggle. Like TextField it forwards its ref
// so React Hook Form's register({...}) drives it uncontrolled — the value is
// never lifted into React state. Visibility is the only local state; the input
// defaults to type="password" with autoComplete off so the value is never
// rendered as plain text or offered to the browser's password manager.
export const SensitiveTextField = forwardRef<
  HTMLInputElement,
  SensitiveTextFieldProps
>(function SensitiveTextField(
  { label, error, autoComplete = "off", ...inputProps },
  ref,
) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <AriaTextField className={fieldStyle()} isInvalid={Boolean(error)}>
      <Label className={labelStyle()}>{label}</Label>
      <div className="relative flex items-stretch">
        <Input
          ref={ref}
          type={isVisible ? "text" : "password"}
          autoComplete={autoComplete}
          className={inputStyle()}
          {...inputProps}
        />
        <button
          type="button"
          aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((visible) => !visible)}
          className={toggleStyle()}
        >
          {isVisible ? "Hide" : "Show"}
        </button>
      </div>
      <FieldError className={errorStyle()}>{error}</FieldError>
    </AriaTextField>
  );
});
