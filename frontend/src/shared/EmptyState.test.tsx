import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

test("shows a spinner and title while loading", () => {
  render(<EmptyState loading title="Loading…" />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  expect(screen.getByRole("img", { name: "Loading" })).toBeInTheDocument();
});

test("shows title and description when empty", () => {
  render(
    <EmptyState title="No results" description="Try a different query." />,
  );
  expect(screen.getByText("No results")).toBeInTheDocument();
  expect(screen.getByText("Try a different query.")).toBeInTheDocument();
});
