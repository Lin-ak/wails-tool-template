import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { TextAreaField } from "./TextAreaField";

test("renders a labelled textarea and shows the field error", () => {
  render(<TextAreaField label="Config" error="Required" />);
  expect(screen.getByLabelText("Config").tagName).toBe("TEXTAREA");
  expect(screen.getByText("Required")).toBeInTheDocument();
});

test("forwards its ref so React Hook Form's register can drive it", () => {
  const ref = createRef<HTMLTextAreaElement>();
  render(<TextAreaField label="Config" ref={ref} />);
  expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
});
