/**
 * BypassConfirmDialog Component Tests
 *
 * Tests for the confirmation dialog when bypassing validation errors.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BypassConfirmDialog } from "../BypassConfirmDialog";

describe("BypassConfirmDialog", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    skippedCount: 5,
    totalCount: 20,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      render(<BypassConfirmDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("should render when isOpen is true", () => {
      render(<BypassConfirmDialog {...defaultProps} />);
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("should display title", () => {
      render(<BypassConfirmDialog {...defaultProps} />);
      expect(screen.getByText(/sync with skipped ads/i)).toBeInTheDocument();
    });

    it("should display skip count and percentage", () => {
      render(<BypassConfirmDialog {...defaultProps} />);
      expect(screen.getByText(/5 of 20 ads/)).toBeInTheDocument();
      expect(screen.getByText(/25%/)).toBeInTheDocument();
    });

    it("should display sync count", () => {
      render(<BypassConfirmDialog {...defaultProps} />);
      expect(screen.getByText(/15 Ads Anyway/i)).toBeInTheDocument();
    });

    it("should display warning message", () => {
      render(<BypassConfirmDialog {...defaultProps} />);
      expect(screen.getByText(/skipped ads will not be created/i)).toBeInTheDocument();
    });
  });

  describe("Actions", () => {
    it("should call onClose when Cancel clicked", () => {
      render(<BypassConfirmDialog {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onConfirm when confirm button clicked", () => {
      render(<BypassConfirmDialog {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: /sync.*anyway/i }));
      expect(defaultProps.onConfirm).toHaveBeenCalled();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should close dialog on Escape key", () => {
      render(<BypassConfirmDialog {...defaultProps} />);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have correct aria attributes", () => {
      render(<BypassConfirmDialog {...defaultProps} />);
      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby");
      expect(dialog).toHaveAttribute("aria-describedby");
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero total ads", () => {
      render(<BypassConfirmDialog {...defaultProps} totalCount={0} skippedCount={0} />);
      expect(screen.getByText(/0 of 0 ads/)).toBeInTheDocument();
    });

    it("should handle all ads skipped", () => {
      render(<BypassConfirmDialog {...defaultProps} totalCount={10} skippedCount={10} />);
      expect(screen.getByText(/100%/)).toBeInTheDocument();
      expect(screen.getByText(/0 Ads Anyway/i)).toBeInTheDocument();
    });
  });
});
