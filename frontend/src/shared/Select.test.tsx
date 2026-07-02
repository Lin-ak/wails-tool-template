import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Select } from "./Select";

const OPTIONS = [
  { value: "tcp", label: "TCP" },
  { value: "udp", label: "UDP" },
];

test("renders the options and seeds the selection via defaultValue", () => {
  render(<Select label="Protocol" options={OPTIONS} defaultValue="udp" />);
  const select = screen.getByLabelText("Protocol") as HTMLSelectElement;
  expect(select.options).toHaveLength(2);
  expect(select.value).toBe("udp");
});

test("shows the error and marks the field invalid", () => {
  render(<Select label="Protocol" options={OPTIONS} error="Required" />);
  expect(screen.getByText("Required")).toBeInTheDocument();
  expect(screen.getByLabelText("Protocol")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});
