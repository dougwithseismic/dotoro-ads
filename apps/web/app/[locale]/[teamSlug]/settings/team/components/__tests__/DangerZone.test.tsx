import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DangerZone } from "../DangerZone";

// Mock useRouter
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => ({
    locale: "en",
  }),
}));

describe("DangerZone", () => {
  const defaultProps = {
    teamId: "team-1",
    teamName: "Test Team",
    isOwner: true,
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the danger zone section", () => {
      render(<DangerZone {...defaultProps} />);

      expect(screen.getByTestId("danger-zone")).toBeInTheDocument();
    });

    it("shows delete team button", () => {
      render(<DangerZone {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /delete team/i })
      ).toBeInTheDocument();
    });

    it("has danger styling", () => {
      render(<DangerZone {...defaultProps} />);

      const section = screen.getByTestId("settings-section");
      expect(section.className).toContain("border-red");
    });
  });

  describe("owner-only visibility", () => {
    it("shows delete button for owners", () => {
      render(<DangerZone {...defaultProps} isOwner={true} />);

      expect(
        screen.getByRole("button", { name: /delete team/i })
      ).toBeInTheDocument();
    });

    it("hides entire section for non-owners", () => {
      render(<DangerZone {...defaultProps} isOwner={false} />);

      expect(screen.queryByTestId("danger-zone")).not.toBeInTheDocument();
    });
  });

  describe("confirmation dialog", () => {
    it("opens dialog when delete button is clicked", async () => {
      const user = userEvent.setup();
      render(<DangerZone {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("shows team name in dialog", async () => {
      const user = userEvent.setup();
      render(<DangerZone {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      // Dialog should contain the team name - use getAllByText since it may appear multiple times
      const teamNameElements = screen.getAllByText(/Test Team/);
      expect(teamNameElements.length).toBeGreaterThan(0);
    });

    it("requires typing team name to confirm", async () => {
      const user = userEvent.setup();
      render(<DangerZone {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByTestId("confirm-delete-button");
      expect(confirmButton).toBeDisabled();
    });

    it("enables confirm button when team name matches", async () => {
      const user = userEvent.setup();
      render(<DangerZone {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      const input = screen.getByRole("textbox", { name: /type.*to confirm/i });
      await user.type(input, "Test Team");

      const confirmButton = screen.getByTestId("confirm-delete-button");
      expect(confirmButton).not.toBeDisabled();
    });

    it("closes dialog on cancel", async () => {
      const user = userEvent.setup();
      render(<DangerZone {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("deletion flow", () => {
    it("calls onDelete when confirmed", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn().mockResolvedValue(undefined);
      render(<DangerZone {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      const input = screen.getByRole("textbox", { name: /type.*to confirm/i });
      await user.type(input, "Test Team");

      const confirmButton = screen.getByTestId("confirm-delete-button");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(onDelete).toHaveBeenCalledWith("team-1");
      });
    });

    it("shows loading state during deletion", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<DangerZone {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      const input = screen.getByRole("textbox", { name: /type.*to confirm/i });
      await user.type(input, "Test Team");

      const confirmButton = screen.getByTestId("confirm-delete-button");
      await user.click(confirmButton);

      expect(screen.getByTestId("delete-loading")).toBeInTheDocument();
    });

    it("redirects to teams list after successful deletion", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn().mockResolvedValue(undefined);
      render(<DangerZone {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      const input = screen.getByRole("textbox", { name: /type.*to confirm/i });
      await user.type(input, "Test Team");

      const confirmButton = screen.getByTestId("confirm-delete-button");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/en/dashboard");
      });
    });
  });

  describe("error handling", () => {
    it("shows error message when deletion fails", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn().mockRejectedValue(new Error("Network error"));
      render(<DangerZone {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      const input = screen.getByRole("textbox", { name: /type.*to confirm/i });
      await user.type(input, "Test Team");

      const confirmButton = screen.getByTestId("confirm-delete-button");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete/i)).toBeInTheDocument();
      });
    });
  });

  describe("case sensitivity", () => {
    it("requires exact case match for team name", async () => {
      const user = userEvent.setup();
      render(<DangerZone {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      const input = screen.getByRole("textbox", { name: /type.*to confirm/i });
      await user.type(input, "test team"); // lowercase

      const confirmButton = screen.getByTestId("confirm-delete-button");
      expect(confirmButton).toBeDisabled();
    });
  });

  describe("accessibility - focus trap", () => {
    it("should have proper dialog role and aria attributes", async () => {
      const user = userEvent.setup();
      render(<DangerZone {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });

    it("should close dialog on Escape key", async () => {
      const user = userEvent.setup();
      render(<DangerZone {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("should focus input when dialog opens", async () => {
      const user = userEvent.setup();
      render(<DangerZone {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole("textbox", { name: /type.*to confirm/i })).toHaveFocus();
      });
    });

    it("should trap focus within dialog on Tab", async () => {
      const user = userEvent.setup();
      render(<DangerZone {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      const input = screen.getByRole("textbox", { name: /type.*to confirm/i });
      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      // Type team name to enable confirm button
      await user.type(input, "Test Team");
      const confirmButton = screen.getByTestId("confirm-delete-button");

      // Start at input
      input.focus();
      expect(document.activeElement).toBe(input);

      // Tab to cancel
      await user.tab();
      expect(document.activeElement).toBe(cancelButton);

      // Tab to confirm (now enabled)
      await user.tab();
      expect(document.activeElement).toBe(confirmButton);

      // Tab should wrap back to input (focus trap)
      await user.tab();
      expect(document.activeElement).toBe(input);
    });

    it("should trap focus within dialog on Shift+Tab", async () => {
      const user = userEvent.setup();
      render(<DangerZone {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      const input = screen.getByRole("textbox", { name: /type.*to confirm/i });

      // Type team name to enable confirm button
      await user.type(input, "Test Team");
      const confirmButton = screen.getByTestId("confirm-delete-button");

      // Start at input
      input.focus();
      expect(document.activeElement).toBe(input);

      // Shift+Tab should wrap to last element (focus trap)
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(confirmButton);
    });

    it("should close dialog when clicking overlay", async () => {
      const user = userEvent.setup();
      render(<DangerZone {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      const overlay = screen.getByTestId("delete-dialog-overlay");
      await user.click(overlay);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("should not close dialog on Escape during deletion", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<DangerZone {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole("button", { name: /delete team/i });
      await user.click(deleteButton);

      const input = screen.getByRole("textbox", { name: /type.*to confirm/i });
      await user.type(input, "Test Team");

      const confirmButton = screen.getByTestId("confirm-delete-button");
      await user.click(confirmButton);

      // During deletion, Escape should not close the dialog
      await user.keyboard("{Escape}");

      // Dialog should still be open
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
