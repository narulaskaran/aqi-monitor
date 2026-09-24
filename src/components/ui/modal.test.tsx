import { useState } from "react";
import { renderWithTheme, screen, fireEvent } from "../../lib/test-utils";
import { Modal } from "./modal";

function TestDialog({ onClose = () => undefined }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>Open dialog</button>
      {open && (
        <Modal
          ariaLabelledBy="dialog-title"
          onClose={() => {
            onClose();
            setOpen(false);
          }}
        >
          <h2 id="dialog-title">Dialog title</h2>
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </Modal>
      )}
    </div>
  );
}

describe("Modal", () => {
  it("renders children in a named modal dialog", () => {
    renderWithTheme(<TestDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    expect(screen.getByRole("dialog", { name: "Dialog title" })).toHaveAttribute(
      "aria-modal",
      "true",
    );
  });

  it("moves focus into dialog then restores it to the opener when closed", () => {
    renderWithTheme(<TestDialog />);
    const opener = screen.getByRole("button", { name: "Open dialog" });

    opener.focus();
    fireEvent.click(opener);

    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(opener).toHaveFocus();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    renderWithTheme(<TestDialog onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps Tab navigation inside the dialog", () => {
    renderWithTheme(<TestDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    const dialog = screen.getByRole("dialog");
    const close = screen.getByRole("button", { name: "Close dialog" });
    const lastAction = screen.getByRole("button", { name: "Last action" });

    lastAction.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(close).toHaveFocus();

    close.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(lastAction).toHaveFocus();
  });
});
