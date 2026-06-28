import { fireEvent, render, screen } from "@testing-library/react";
import { ContextMenu, type MenuItem } from "./ContextMenu";

test("renders items and fires onSelect + onClose on click", () => {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  const items: MenuItem[] = [
    { label: "Open", onSelect },
    {
      label: "Delete",
      onSelect: () => {},
      danger: true,
      separatorBefore: true,
    },
  ];
  render(<ContextMenu x={10} y={10} items={items} onClose={onClose} />);

  expect(screen.getAllByRole("menuitem")).toHaveLength(2);
  fireEvent.click(screen.getByText("Open"));
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("disabled items do nothing", () => {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  render(
    <ContextMenu
      x={0}
      y={0}
      items={[{ label: "Nope", onSelect, disabled: true }]}
      onClose={onClose}
    />,
  );
  fireEvent.click(screen.getByText("Nope"));
  expect(onSelect).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

test("Escape closes the menu", () => {
  const onClose = vi.fn();
  render(
    <ContextMenu
      x={0}
      y={0}
      items={[{ label: "X", onSelect: () => {} }]}
      onClose={onClose}
    />,
  );
  fireEvent.keyDown(window, { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);
});
