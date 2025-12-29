import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamCard } from "../TeamCard";
import type { Team } from "@/lib/teams/types";

const mockTeam: Team = {
  id: "team-1",
  name: "Acme Corp",
  slug: "acme-corp",
  description: "Our main team",
  avatarUrl: null,
  plan: "pro",
  memberCount: 5,
  role: "owner",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("TeamCard", () => {
  const user = userEvent.setup();
  const mockOnSelect = vi.fn();
  const mockOnLeave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render team name", () => {
      render(
        <TeamCard
          team={mockTeam}
          isSelected={false}
          isPersonal={false}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    it("should render team avatar initial", () => {
      render(
        <TeamCard
          team={mockTeam}
          isSelected={false}
          isPersonal={false}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("should render member count", () => {
      render(
        <TeamCard
          team={mockTeam}
          isSelected={false}
          isPersonal={false}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByText(/5 members/i)).toBeInTheDocument();
    });

    it("should render role badge", () => {
      render(
        <TeamCard
          team={mockTeam}
          isSelected={false}
          isPersonal={false}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByText("Owner")).toBeInTheDocument();
    });

    it("should render admin role badge correctly", () => {
      const adminTeam = { ...mockTeam, role: "admin" as const };
      render(
        <TeamCard
          team={adminTeam}
          isSelected={false}
          isPersonal={false}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("should render editor role badge correctly", () => {
      const editorTeam = { ...mockTeam, role: "editor" as const };
      render(
        <TeamCard
          team={editorTeam}
          isSelected={false}
          isPersonal={false}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByText("Editor")).toBeInTheDocument();
    });

    it("should render viewer role badge correctly", () => {
      const viewerTeam = { ...mockTeam, role: "viewer" as const };
      render(
        <TeamCard
          team={viewerTeam}
          isSelected={false}
          isPersonal={false}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByText("Viewer")).toBeInTheDocument();
    });
  });

  describe("Selected State", () => {
    it("should show selected indicator when isSelected is true", () => {
      render(
        <TeamCard
          team={mockTeam}
          isSelected={true}
          isPersonal={false}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      const card = screen.getByTestId("team-card-team-1");
      expect(card).toHaveAttribute("data-selected", "true");
    });

    it("should not show selected indicator when isSelected is false", () => {
      render(
        <TeamCard
          team={mockTeam}
          isSelected={false}
          isPersonal={false}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      const card = screen.getByTestId("team-card-team-1");
      expect(card).toHaveAttribute("data-selected", "false");
    });
  });

  describe("Personal Team", () => {
    it("should show personal badge when isPersonal is true", () => {
      render(
        <TeamCard
          team={mockTeam}
          isSelected={false}
          isPersonal={true}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByText("Personal")).toBeInTheDocument();
    });

    it("should not show personal badge when isPersonal is false", () => {
      render(
        <TeamCard
          team={mockTeam}
          isSelected={false}
          isPersonal={false}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.queryByText("Personal")).not.toBeInTheDocument();
    });

    it("should not show leave button when isPersonal is true", () => {
      render(
        <TeamCard
          team={mockTeam}
          isSelected={false}
          isPersonal={true}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.queryByRole("button", { name: /leave/i })).not.toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should call onSelect when card is clicked", async () => {
      render(
        <TeamCard
          team={mockTeam}
          isSelected={false}
          isPersonal={false}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      const card = screen.getByTestId("team-card-team-1");
      await user.click(card);

      expect(mockOnSelect).toHaveBeenCalledWith(mockTeam);
    });

    it("should call onLeave when leave button is clicked", async () => {
      render(
        <TeamCard
          team={mockTeam}
          isSelected={false}
          isPersonal={false}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      const leaveButton = screen.getByRole("button", { name: /leave/i });
      await user.click(leaveButton);

      expect(mockOnLeave).toHaveBeenCalledWith(mockTeam);
    });

    it("should not trigger onSelect when leave button is clicked", async () => {
      render(
        <TeamCard
          team={mockTeam}
          isSelected={false}
          isPersonal={false}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      const leaveButton = screen.getByRole("button", { name: /leave/i });
      await user.click(leaveButton);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible role for the card", () => {
      render(
        <TeamCard
          team={mockTeam}
          isSelected={false}
          isPersonal={false}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      const card = screen.getByTestId("team-card-team-1");
      expect(card).toHaveAttribute("role", "button");
    });

    it("should have appropriate aria-label", () => {
      render(
        <TeamCard
          team={mockTeam}
          isSelected={false}
          isPersonal={false}
          onSelect={mockOnSelect}
          onLeave={mockOnLeave}
        />
      );

      const card = screen.getByTestId("team-card-team-1");
      expect(card).toHaveAttribute("aria-label", "Select Acme Corp team");
    });
  });
});
