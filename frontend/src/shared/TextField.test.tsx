import { render, screen } from "@testing-library/react";
import { TextField } from "./TextField";

// Regression: React Hook Form's defaultValues do NOT populate a React Aria-
// wrapped input for display — the value lives in RHF state (so an unchanged
// field still submits it) but the field renders blank. Seeding via the field's
// own `defaultValue` (RAC's initial-value path) is what actually shows it.
test("displays its defaultValue", () => {
  render(<TextField label="Host" defaultValue="example.com" />);
  expect((screen.getByLabelText("Host") as HTMLInputElement).value).toBe(
    "example.com",
  );
});
