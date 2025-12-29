import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeaveTeamDialog } from "../LeaveTeamDialog";
import type { Team } from "@/lib/teams/types";

const mockTeam: Team = {
  id: "team-1",
  name: "Acme Corp",
  slug: "acme-corp",
  description: "Our main team",
  avatarUrl: null,
  plan: "pro",
  memberCount: 5,
  role: "editor",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("LeaveTeamDialog", () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
  });

  describe("Visibility", () => {
    it("should not render when isOpen is false", () => {
      render(
        <LeaveTeamDialog
          isOpen={false}
          team={mockTeam}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render when isOpen is true", () => {
      render(
        <LeaveTeamDialog
          isOpen={true}
          team={mockTeam}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("Content", () => {
    it("should display team name in the dialog", () => {
      render(
        <LeaveTeamDialog
          isOpen={true}
          team={mockTeam}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // Team name appears in both title and message
      const matches = screen.getAllByText(/Acme Corp/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("should display warning message about losing access", () => {
      render(
        <LeaveTeamDialog
          isOpen={true}
          team={mockTeam}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText(/lose access/i)).toBeInTheDocument();
    });

    it("should display cancel and confirm buttons", () => {
      render(
        <LeaveTeamDialog
          isOpen={true}
          team={mockTeam}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /leave team/i })).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should call onClose when cancel button is clicked", async () => {
      render(
        <LeaveTeamDialog
          isOpen={true}
          team={mockTeam}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should call onConfirm when leave team button is clicked", async () => {
      render(
        <LeaveTeamDialog
          isOpen={true}
          team={mockTeam}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const leaveButton = screen.getByRole("button", { name: /leave team/i });
      await user.click(leaveButton);

      expect(mockOnConfirm).toHaveBeenCalled();
    });

    it("should call onClose when overlay is clicked", async () => {
      render(
        <LeaveTeamDialog
          isOpen={true}
          team={mockTeam}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const overlay = screen.getByTestId("dialog-overlay");
      await user.click(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should not close when dialog content is clicked", async () => {
      render(
        <LeaveTeamDialog
          isOpen={true}
          team={mockTeam}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const dialog = screen.getByRole("dialog");
      await user.click(dialog);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    it("should show loading state when confirming", async () => {
      let resolveConfirm: () => void;
      const confirmPromise = new Promise<void>((resolve) => {
        resolveConfirm = resolve;
      });
      mockOnConfirm.mockReturnValue(confirmPromise);

      render(
        <LeaveTeamDialog
          isOpen={true}
          team={mockTeam}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const leaveButton = screen.getByRole("button", { name: /leave team/i });
      await user.click(leaveButton);

      await waitFor(() => {
        expect(screen.getByText(/leaving/i)).toBeInTheDocument();
      });

      // Resolve the promise
      resolveConfirm!();
    });

    it("should disable buttons while confirming", async () => {
      let resolveConfirm: () => void;
      const confirmPromise = new Promise<void>((resolve) => {
        resolveConfirm = resolve;
      });
      mockOnConfirm.mockReturnValue(confirmPromise);

      render(
        <LeaveTeamDialog
          isOpen={true}
          team={mockTeam}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const leaveButton = screen.getByRole("button", { name: /leave team/i });
      await user.click(leaveButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
        expect(screen.getByRole("button", { name: /leaving/i })).toBeDisabled();
      });

      resolveConfirm!();
    });
  });

  describe("Error Handling", () => {
    it("should show error message when confirmation fails", async () => {
      mockOnConfirm.mockRejectedValue(new Error("Network error"));

      render(
        <LeaveTeamDialog
          isOpen={true}
          team={mockTeam}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const leaveButton = screen.getByRole("button", { name: /leave team/i });
      await user.click(leaveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to leave/i)).toBeInTheDocument();
      });
    });

    it("should allow retry after error", async () => {
      mockOnConfirm.mockRejectedValueOnce(new Error("Network error"));
      mockOnConfirm.mockResolvedValueOnce(undefined);

      render(
        <LeaveTeamDialog
          isOpen={true}
          team={mockTeam}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const leaveButton = screen.getByRole("button", { name: /leave team/i });
      await user.click(leaveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to leave/i)).toBeInTheDocument();
      });

      // Retry
      await user.click(screen.getByRole("button", { name: /leave team/i }));

      expect(mockOnConfirm).toHaveBeenCalledTimes(2);
    });
  });

  describe("Accessibility", () => {
    it("should have proper dialog role and aria attributes", () => {
      render(
        <LeaveTeamDialog
          isOpen={true}
          team={mockTeam}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });

    it("should focus the cancel button when dialog opens", async () => {
      render(
        <LeaveTeamDialog
          isOpen={true}
          team={mockTeam}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /cancel/i })).toHaveFocus();
      });
    });
  });
});
