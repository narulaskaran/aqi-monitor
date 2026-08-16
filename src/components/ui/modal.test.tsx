import { renderWithTheme, screen, fireEvent } from "../../lib/test-utils";
import { Modal } from "./modal";

describe("Modal", () => {
  it("renders children", () => {
    renderWithTheme(
      <Modal>
        <h3>Confirm</h3>
      </Modal>,
    );
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  it("renders a close button when onClose is provided", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <Modal onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("omits the close button when onClose is omitted", () => {
    renderWithTheme(
      <Modal>
        <p>Content</p>
      </Modal>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
