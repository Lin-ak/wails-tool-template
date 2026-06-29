import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "react-aria-components";
import { useForm } from "react-hook-form";
import { errorMessage } from "../../bridge/errorMessage";
import { useDoExample } from "../../bridge/queries";
import { Button } from "../../shared/Button";
import { SensitiveTextField } from "../../shared/SensitiveTextField";
import { StatusMessage } from "../../shared/StatusMessage";
import { sanitizeSensitiveText } from "../../shared/sensitiveText";
import { TextField } from "../../shared/TextField";
import { type ExampleInput, type ExampleOutput, exampleSchema } from "./schema";

// Fields are assembled from the shared kit (Button / TextField /
// SensitiveTextField) rather than hand-wired RAC primitives, and any backend
// error text is passed through sanitizeSensitiveText before display.
export function ExampleForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExampleInput, unknown, ExampleOutput>({
    resolver: zodResolver(exampleSchema),
  });
  const run = useDoExample();

  return (
    <Form
      className="flex max-w-md flex-col gap-4"
      onSubmit={handleSubmit((values) => run.mutate(values))}
    >
      <TextField
        label="Host"
        error={errors.host?.message}
        {...register("host")}
      />
      <TextField
        label="Port"
        type="number"
        inputMode="numeric"
        error={errors.port?.message}
        {...register("port")}
      />
      <SensitiveTextField
        label="Secret"
        error={errors.secret?.message}
        {...register("secret")}
      />

      <Button type="submit" isPending={run.isPending}>
        {run.isPending ? "Running…" : "Run"}
      </Button>

      {run.isError ? (
        <StatusMessage tone="error">
          {sanitizeSensitiveText(errorMessage(run.error))}
        </StatusMessage>
      ) : null}
      {run.isSuccess ? (
        <StatusMessage tone={run.data.ok ? "success" : "error"}>
          {run.data.ok
            ? "Done."
            : sanitizeSensitiveText(run.data.error) || "Failed."}
        </StatusMessage>
      ) : null}
    </Form>
  );
}
