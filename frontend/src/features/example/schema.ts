import { z } from "zod";

// One Zod schema drives both runtime validation (via the RHF resolver) and the
// inferred TS types. Mirror the Go domain validation rules here.
export const exampleSchema = z.object({
  // .trim() so a whitespace-only host fails, matching the Go backend (which
  // trims and rejects an empty host).
  host: z.string().trim().min(1, "Host is required"),
  port: z.coerce.number().int().min(1).max(65535),
  secret: z.string().min(1, "Secret is required"),
});

// Input = the raw form field values (before coercion); Output = the validated,
// transformed values. With z.coerce, these differ (port: unknown → number), so
// RHF is parameterized with both.
export type ExampleInput = z.input<typeof exampleSchema>;
export type ExampleOutput = z.output<typeof exampleSchema>;
