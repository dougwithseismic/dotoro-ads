import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { BillingEmailForm } from "../BillingEmailForm";

describe("BillingEmailForm", () => {
  const defaultProps = {
    currentEmail: "billing@example.com",
    onSave: vi.fn(),
    isOwner: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the form", () => {
      render(<BillingEmailForm {...defaultProps} />);

      expect(screen.getByTestId("billing-email-form")).toBeInTheDocument();
    });

    it("displays the current email in the input", () => {
      render(<BillingEmailForm {...defaultProps} />);

      const input = screen.getByRole("textbox", { name: /billing email/i });
      expect(input).toHaveValue("billing@example.com");
    });

    it("displays empty input when no current email", () => {
      render(<BillingEmailForm {...defaultProps} currentEmail={null} />);

      const input = screen.getByRole("textbox", { name: /billing email/i });
      expect(input).toHaveValue("");
    });

    it("shows save button when user is owner", () => {
      render(<BillingEmailForm {...defaultProps} />);

      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });
  });

  describe("owner-only editing", () => {
    it("disables input when user is not owner", () => {
      render(<BillingEmailForm {...defaultProps} isOwner={false} />);

      const input = screen.getByRole("textbox", { name: /billing email/i });
      expect(input).toBeDisabled();
    });

    it("hides save button when user is not owner", () => {
      render(<BillingEmailForm {...defaultProps} isOwner={false} />);

      expect(
        screen.queryByRole("button", { name: /save/i })
      ).not.toBeInTheDocument();
    });

    it("shows owner-only message for non-owners", () => {
      render(<BillingEmailForm {...defaultProps} isOwner={false} />);

      expect(
        screen.getByText(/only the team owner can edit/i)
      ).toBeInTheDocument();
    });
  });

  describe("form validation", () => {
    it("validates email format", async () => {
      const user = userEvent.setup();
      render(<BillingEmailForm {...defaultProps} />);

      const input = screen.getByRole("textbox", { name: /billing email/i });
      await user.clear(input);
      await user.type(input, "invalid-email");

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email/i)
        ).toBeInTheDocument();
      });
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it("accepts valid email", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<BillingEmailForm {...defaultProps} onSave={onSave} />);

      const input = screen.getByRole("textbox", { name: /billing email/i });
      await user.clear(input);
      await user.type(input, "newemail@example.com");

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      expect(
        screen.queryByText(/please enter a valid email/i)
      ).not.toBeInTheDocument();
      expect(onSave).toHaveBeenCalledWith("newemail@example.com");
    });

    it("allows empty email (to clear billing email)", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<BillingEmailForm {...defaultProps} onSave={onSave} />);

      const input = screen.getByRole("textbox", { name: /billing email/i });
      await user.clear(input);

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      expect(onSave).toHaveBeenCalledWith("");
    });
  });

  describe("loading state", () => {
    it("shows loading state while saving", async () => {
      const onSave = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      const user = userEvent.setup();
      render(<BillingEmailForm {...defaultProps} onSave={onSave} />);

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      expect(screen.getByTestId("save-loading")).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    it("disables input while saving", async () => {
      const onSave = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      const user = userEvent.setup();
      render(<BillingEmailForm {...defaultProps} onSave={onSave} />);

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      const input = screen.getByRole("textbox", { name: /billing email/i });
      expect(input).toBeDisabled();
    });
  });

  describe("success feedback", () => {
    it("shows success message after save", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<BillingEmailForm {...defaultProps} onSave={onSave} />);

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("shows error message when save fails", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockRejectedValue(new Error("Network error"));
      render(<BillingEmailForm {...defaultProps} onSave={onSave} />);

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("has proper label for email input", () => {
      render(<BillingEmailForm {...defaultProps} />);

      const input = screen.getByRole("textbox", { name: /billing email/i });
      expect(input).toBeInTheDocument();
    });

    it("has description text", () => {
      render(<BillingEmailForm {...defaultProps} />);

      expect(
        screen.getByText(/invoices and receipts will be sent/i)
      ).toBeInTheDocument();
    });
  });
});
