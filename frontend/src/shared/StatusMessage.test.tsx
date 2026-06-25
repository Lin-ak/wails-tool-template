import { render, screen } from "@testing-library/react";
import { StatusMessage } from "./StatusMessage";

test("renders status text with the status role", () => {
  render(<StatusMessage tone="success">All good</StatusMessage>);
  expect(screen.getByRole("status")).toHaveTextContent("All good");
});
