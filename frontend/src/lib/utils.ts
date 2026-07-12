import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// cn — shadcn/ui's class combinator: clsx for conditionals, tailwind-merge so a
// caller's "p-6" cleanly overrides a component's default "p-4".
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
