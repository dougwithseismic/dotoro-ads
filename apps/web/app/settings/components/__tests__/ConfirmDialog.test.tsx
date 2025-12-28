import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfirmDialog } from "../ConfirmDialog";

describe("ConfirmDialog", () => {
  const user = userEvent.setup();

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: "Confirm Action",
    message: "Are you sure you want to proceed?",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render when isOpen is true", () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should not render when isOpen is false", () => {
      render(<ConfirmDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render the title", () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByText("Confirm Action")).toBeInTheDocument();
    });

    it("should render the message", () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByText("Are you sure you want to proceed?")).toBeInTheDocument();
    });

    it("should render Cancel and Confirm buttons", () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    });
  });

  describe("Button Actions", () => {
    it("should call onClose when Cancel is clicked", async () => {
      render(<ConfirmDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onConfirm when Confirm is clicked", async () => {
      render(<ConfirmDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /confirm/i }));

      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when clicking overlay", async () => {
      render(<ConfirmDialog {...defaultProps} />);

      const overlay = screen.getByTestId("dialog-overlay");
      await user.click(overlay);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("should not close when clicking inside dialog content", async () => {
      render(<ConfirmDialog {...defaultProps} />);

      const dialogContent = screen.getByTestId("dialog-content");
      await user.click(dialogContent);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe("Custom Labels", () => {
    it("should allow custom cancel label", () => {
      render(<ConfirmDialog {...defaultProps} cancelLabel="No, go back" />);

      expect(screen.getByRole("button", { name: /no, go back/i })).toBeInTheDocument();
    });

    it("should allow custom confirm label", () => {
      render(<ConfirmDialog {...defaultProps} confirmLabel="Yes, proceed" />);

      expect(screen.getByRole("button", { name: /yes, proceed/i })).toBeInTheDocument();
    });
  });

  describe("Danger Variant", () => {
    it("should apply danger styling when variant is danger", () => {
      render(<ConfirmDialog {...defaultProps} variant="danger" />);

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      expect(confirmButton).toHaveClass("bg-red-600");
    });

    it("should not apply danger styling by default", () => {
      render(<ConfirmDialog {...defaultProps} />);

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      expect(confirmButton).not.toHaveClass("bg-red-600");
      expect(confirmButton).toHaveClass("bg-blue-600");
    });
  });

  describe("Loading State", () => {
    it("should show loading state when isLoading is true", () => {
      render(<ConfirmDialog {...defaultProps} isLoading />);

      expect(screen.getByTestId("confirm-loading")).toBeInTheDocument();
    });

    it("should disable buttons when loading", () => {
      render(<ConfirmDialog {...defaultProps} isLoading />);

      expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /confirm/i })).toBeDisabled();
    });

    it("should not call onConfirm when loading and confirm clicked", async () => {
      render(<ConfirmDialog {...defaultProps} isLoading />);

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await user.click(confirmButton);

      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have dialog role", () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should have aria-modal attribute", () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("should have aria-labelledby pointing to title", () => {
      render(<ConfirmDialog {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      const titleId = dialog.getAttribute("aria-labelledby");
      expect(titleId).toBeTruthy();
      expect(document.getElementById(titleId!)).toHaveTextContent("Confirm Action");
    });

    it("should trap focus within dialog", async () => {
      render(<ConfirmDialog {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      const confirmButton = screen.getByRole("button", { name: /confirm/i });

      // Tab through elements
      cancelButton.focus();
      expect(document.activeElement).toBe(cancelButton);

      await user.tab();
      expect(document.activeElement).toBe(confirmButton);
    });

    it("should close on Escape key press", async () => {
      render(<ConfirmDialog {...defaultProps} />);

      await user.keyboard("{Escape}");

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Description", () => {
    it("should render description when provided", () => {
      render(
        <ConfirmDialog
          {...defaultProps}
          description="This action cannot be undone."
        />
      );

      expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
    });
  });
});
