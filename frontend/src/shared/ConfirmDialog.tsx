import type { ReactNode } from "react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { Button } from "./Button";

// A controlled confirm/alert modal built on React Aria's Modal + Dialog. RAC
// handles the focus trap, Escape-to-dismiss and focus restoration; Cancel is
// autoFocused so keyboard users land on the safe choice.
export function ConfirmDialog(props: {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "info" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalOverlay
      isOpen={props.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          props.onCancel();
        }
      }}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <Modal className="w-full max-w-md rounded-panel border border-border bg-surface p-5 shadow-xl outline-none">
        <Dialog role="alertdialog" className="outline-none">
          <Heading
            slot="title"
            className="m-0 mb-2 text-base font-semibold text-neutral-900"
          >
            {props.title}
          </Heading>
          <div className="mb-4 text-sm text-neutral-600">{props.children}</div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onPress={props.onCancel} autoFocus>
              {props.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant={props.variant === "warning" ? "danger" : "primary"}
              onPress={props.onConfirm}
            >
              {props.confirmLabel}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
