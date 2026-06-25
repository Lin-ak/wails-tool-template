import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "react-aria-components";
import { useForm } from "react-hook-form";
import { tv } from "tailwind-variants";
import { useDoExample } from "../../bridge/queries";
import { StatusMessage } from "../../shared/StatusMessage";
import { type ExampleInput, exampleSchema } from "./schema";

// RAC exposes component state as data-attributes (data-hovered, data-focused,
// data-pressed, data-invalid, data-disabled). We target them with Tailwind v4's
// native data-[...] variants — reliable under v4's CSS-first config.
const field = tv({ base: "mb-4 flex flex-col gap-1" });
const label = tv({ base: "text-sm font-medium text-neutral-700" });
const input = tv({
  base: "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none data-[focused]:border-brand-500 data-[focused]:ring-2 data-[focused]:ring-brand-500/30 data-[invalid]:border-red-500",
});
const errorText = tv({ base: "text-xs text-red-700" });
const button = tv({
  base: "rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white outline-none data-[hovered]:bg-brand-700 data-[pressed]:bg-brand-700 data-[focus-visible]:ring-2 data-[focus-visible]:ring-brand-500/40 data-[disabled]:opacity-50",
});

export function ExampleForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExampleInput>({ resolver: zodResolver(exampleSchema) });
  const run = useDoExample();

  return (
    <Form
      className="max-w-md"
      onSubmit={handleSubmit((values) => run.mutate(values))}
    >
      <TextField className={field()} isInvalid={Boolean(errors.host)}>
        <Label className={label()}>Host</Label>
        <Input className={input()} {...register("host")} />
        <FieldError className={errorText()}>{errors.host?.message}</FieldError>
      </TextField>

      <TextField className={field()} isInvalid={Boolean(errors.port)}>
        <Label className={label()}>Port</Label>
        <Input className={input()} type="number" {...register("port")} />
        <FieldError className={errorText()}>{errors.port?.message}</FieldError>
      </TextField>

      <TextField className={field()} isInvalid={Boolean(errors.secret)}>
        <Label className={label()}>Secret</Label>
        <Input className={input()} type="password" {...register("secret")} />
        <FieldError className={errorText()}>
          {errors.secret?.message}
        </FieldError>
      </TextField>

      <Button type="submit" className={button()} isPending={run.isPending}>
        {run.isPending ? "Running…" : "Run"}
      </Button>

      {run.isError ? (
        <StatusMessage tone="error">
          {(run.error as Error).message}
        </StatusMessage>
      ) : null}
      {run.isSuccess ? (
        <StatusMessage tone={run.data.ok ? "success" : "error"}>
          {run.data.ok ? "Done." : (run.data.error ?? "Failed.")}
        </StatusMessage>
      ) : null}
    </Form>
  );
}
