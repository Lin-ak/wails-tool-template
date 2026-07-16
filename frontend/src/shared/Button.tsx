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
  // Emil: physical press feedback — a subtle scale on data-pressed (RAC), with
  // transform in the transition. 0.98 is the "professional/crisp" end of his
  // 0.95–0.98 range; ~150ms ease-out. Reduced-motion drops the transform (see
  // app.css) so only the colour animates.
  base: "inline-flex items-center justify-center gap-2 rounded-md font-medium outline-none transition-[color,background-color,border-color,transform] duration-150 ease-out data-[pressed]:scale-[0.98] data-[focus-visible]:ring-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
  variants: {
    variant: {
      // brand-700, not brand-500: white label text needs ≥4.5:1 (WCAG AA) and
      // brand-500 only reaches ~3.4:1. brand-500 stays for rings/accents.
      primary:
        "bg-brand-700 text-white data-[hovered]:bg-brand-800 data-[pressed]:bg-brand-800 data-[focus-visible]:ring-brand-500/40",
      secondary:
        "border border-border bg-surface text-foreground data-[hovered]:bg-surface-muted data-[focus-visible]:ring-brand-500/30",
      danger:
        "bg-destructive text-destructive-foreground data-[hovered]:bg-destructive/90 data-[pressed]:bg-destructive/90 data-[focus-visible]:ring-destructive/40",
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
