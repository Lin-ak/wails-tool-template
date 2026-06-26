import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
} from "react-aria-components";
import { tv } from "tailwind-variants/lite";

// RAC exposes interaction state as data-attributes (data-hovered, data-pressed,
// data-focus-visible, data-disabled); we target them with Tailwind v4's native
// data-[...] variants. One recipe, two knobs (variant + size) — features pick a
// variant instead of re-deriving button styles per screen.
const button = tv({
  base: "inline-flex items-center justify-center gap-2 rounded-md font-medium outline-none transition-colors data-[focus-visible]:ring-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
  variants: {
    variant: {
      primary:
        "bg-brand-500 text-white data-[hovered]:bg-brand-700 data-[pressed]:bg-brand-700 data-[focus-visible]:ring-brand-500/40",
      secondary:
        "border border-border bg-surface text-neutral-800 data-[hovered]:bg-surface-muted data-[focus-visible]:ring-brand-500/30",
      danger:
        "bg-red-600 text-white data-[hovered]:bg-red-700 data-[pressed]:bg-red-700 data-[focus-visible]:ring-red-500/40",
    },
    size: {
      sm: "px-2.5 py-1 text-xs",
      md: "px-4 py-2 text-sm",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

export interface ButtonProps extends AriaButtonProps {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  className?: string;
}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <AriaButton className={button({ variant, size, className })} {...props} />
  );
}
