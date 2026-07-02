import type { ReactNode } from "react";

// A labelled group of related fields within a form (e.g. Connection / Target).
export function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="mb-1 p-0 text-xs font-semibold text-neutral-500">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
