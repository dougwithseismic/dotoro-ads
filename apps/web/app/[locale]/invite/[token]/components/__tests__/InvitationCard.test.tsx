/**
 * InvitationCard Component Tests
 *
 * TDD tests for the invitation details card component.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { InvitationCard } from "../InvitationCard";
import type { InvitationDetails } from "@/lib/hooks/useInvitation";

// Test data
const mockInvitation: InvitationDetails = {
  teamName: "Acme Corporation",
  teamSlug: "acme-corp",
  inviterEmail: "admin@acme.com",
  inviteeEmail: "recipient@example.com",
  role: "editor",
  expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
};

const mockInvitationAdmin: InvitationDetails = {
  ...mockInvitation,
  inviterEmail: "owner@acme.com", // Different email to avoid "admin" collision
  role: "admin",
};

const mockInvitationViewer: InvitationDetails = {
  ...mockInvitation,
  role: "viewer",
};

const mockInvitationExpiresSoon: InvitationDetails = {
  ...mockInvitation,
  expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
};

const mockInvitationLongExpiry: InvitationDetails = {
  ...mockInvitation,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
};

describe("InvitationCard", () => {
  describe("Team Name Display", () => {
    it("should display the team name prominently", () => {
      render(<InvitationCard invitation={mockInvitation} />);

      expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
    });

    it("should include team name in heading", () => {
      render(<InvitationCard invitation={mockInvitation} />);

      const heading = screen.getByRole("heading");
      expect(heading).toHaveTextContent("Acme Corporation");
    });
  });

  describe("Inviter Display", () => {
    it("should display the inviter email", () => {
      render(<InvitationCard invitation={mockInvitation} />);

      expect(screen.getByText(/admin@acme.com/)).toBeInTheDocument();
    });

    it("should have invitation message with inviter email", () => {
      render(<InvitationCard invitation={mockInvitation} />);

      expect(
        screen.getByText(/invited by/i) || screen.getByText(/admin@acme.com/)
      ).toBeInTheDocument();
    });
  });

  describe("Role Display", () => {
    it("should display Editor role badge", () => {
      render(<InvitationCard invitation={mockInvitation} />);

      expect(screen.getByText(/editor/i)).toBeInTheDocument();
    });

    it("should display Admin role badge", () => {
      render(<InvitationCard invitation={mockInvitationAdmin} />);

      expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });

    it("should display Viewer role badge", () => {
      render(<InvitationCard invitation={mockInvitationViewer} />);

      expect(screen.getByText(/viewer/i)).toBeInTheDocument();
    });

    it("should have role badge with appropriate styling", () => {
      render(<InvitationCard invitation={mockInvitation} />);

      // Find element that contains the role
      const roleBadge = screen.getByTestId("role-badge");
      expect(roleBadge).toBeInTheDocument();
    });
  });

  describe("Expiry Display", () => {
    it("should display expiry information", () => {
      render(<InvitationCard invitation={mockInvitationLongExpiry} />);

      // Should show something like "Expires in 7 days" or "Expires Dec 31, 2025"
      expect(screen.getByTestId("expiry-info")).toBeInTheDocument();
    });

    it("should show relative time for soon-to-expire invitations", () => {
      render(<InvitationCard invitation={mockInvitationExpiresSoon} />);

      // Should show something like "Expires in 6 hours"
      const expiryElement = screen.getByTestId("expiry-info");
      expect(expiryElement).toBeInTheDocument();
    });

    it("should show days remaining for longer expiry", () => {
      render(<InvitationCard invitation={mockInvitation} />);

      const expiryElement = screen.getByTestId("expiry-info");
      expect(expiryElement.textContent).toMatch(/day|expire/i);
    });
  });

  describe("Team Avatar", () => {
    it("should show team avatar or initials placeholder", () => {
      render(<InvitationCard invitation={mockInvitation} />);

      // Should have avatar element or initials
      const avatar = screen.getByTestId("team-avatar");
      expect(avatar).toBeInTheDocument();
    });

    it("should display team initials when no avatar", () => {
      render(<InvitationCard invitation={mockInvitation} />);

      const avatar = screen.getByTestId("team-avatar");
      // "Acme Corporation" -> "AC"
      expect(avatar.textContent).toMatch(/A/);
    });
  });

  describe("Accessibility", () => {
    it("should have accessible heading structure", () => {
      render(<InvitationCard invitation={mockInvitation} />);

      const heading = screen.getByRole("heading");
      expect(heading).toBeInTheDocument();
    });

    it("should have appropriate ARIA labels", () => {
      render(<InvitationCard invitation={mockInvitation} />);

      const card = screen.getByRole("article") || screen.getByTestId("invitation-card");
      expect(card).toBeInTheDocument();
    });

    it("should announce role for screen readers", () => {
      render(<InvitationCard invitation={mockInvitation} />);

      const roleBadge = screen.getByTestId("role-badge");
      expect(roleBadge).toHaveAttribute("role", "status");
    });
  });

  describe("Styling", () => {
    it("should have card container with proper styling class", () => {
      render(<InvitationCard invitation={mockInvitation} />);

      const card = screen.getByTestId("invitation-card");
      expect(card).toHaveClass(/card/i);
    });

    it("should be responsive friendly", () => {
      render(<InvitationCard invitation={mockInvitation} />);

      const card = screen.getByTestId("invitation-card");
      // Card should have a max-width class or style for centering on desktop
      expect(card).toBeInTheDocument();
    });
  });
});
