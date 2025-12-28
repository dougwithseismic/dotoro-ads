/**
 * ErrorStates Component Tests
 *
 * TDD tests for various error state displays on the invitation page.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  InvalidTokenError,
  ExpiredInvitationError,
  AlreadyMemberError,
  DeclinedView,
} from "../ErrorStates";

describe("ErrorStates", () => {
  describe("InvalidTokenError", () => {
    it("should display 'Invitation Not Found' heading", () => {
      render(<InvalidTokenError />);

      expect(screen.getByRole("heading")).toHaveTextContent(/not found/i);
    });

    it("should display a helpful message about invalid link", () => {
      render(<InvalidTokenError />);

      expect(screen.getByText(/invalid|revoked/i)).toBeInTheDocument();
    });

    it("should suggest contacting team admin", () => {
      render(<InvalidTokenError />);

      expect(screen.getByText(/contact.*admin/i)).toBeInTheDocument();
    });

    it("should have a Go to Homepage button", () => {
      render(<InvalidTokenError />);

      const link = screen.getByRole("link", { name: /home/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/");
    });

    it("should display error icon", () => {
      render(<InvalidTokenError />);

      expect(screen.getByTestId("error-icon")).toBeInTheDocument();
    });
  });

  describe("ExpiredInvitationError", () => {
    it("should display 'Invitation Expired' heading", () => {
      render(<ExpiredInvitationError />);

      expect(screen.getByRole("heading")).toHaveTextContent(/expired/i);
    });

    it("should display message about requesting new invitation", () => {
      render(<ExpiredInvitationError />);

      expect(screen.getByText(/request.*new/i)).toBeInTheDocument();
    });

    it("should have a Go to Homepage button", () => {
      render(<ExpiredInvitationError />);

      const link = screen.getByRole("link", { name: /home/i });
      expect(link).toBeInTheDocument();
    });

    it("should display clock/expired icon", () => {
      render(<ExpiredInvitationError />);

      expect(screen.getByTestId("expired-icon")).toBeInTheDocument();
    });
  });

  describe("AlreadyMemberError", () => {
    const defaultProps = {
      teamName: "Acme Corporation",
      teamSlug: "acme-corp",
    };

    it("should display 'Already a Member' heading", () => {
      render(<AlreadyMemberError {...defaultProps} />);

      expect(screen.getByRole("heading")).toHaveTextContent(/already.*member/i);
    });

    it("should display team name in message", () => {
      render(<AlreadyMemberError {...defaultProps} />);

      expect(screen.getByText(/Acme Corporation/)).toBeInTheDocument();
    });

    it("should have a Go to Team button", () => {
      render(<AlreadyMemberError {...defaultProps} />);

      const link = screen.getByRole("link", { name: /go to team/i });
      expect(link).toBeInTheDocument();
    });

    it("should link to correct team URL", () => {
      render(<AlreadyMemberError {...defaultProps} />);

      const link = screen.getByRole("link", { name: /go to team/i });
      expect(link).toHaveAttribute("href", expect.stringContaining("acme-corp"));
    });

    it("should display info icon", () => {
      render(<AlreadyMemberError {...defaultProps} />);

      expect(screen.getByTestId("info-icon")).toBeInTheDocument();
    });
  });

  describe("DeclinedView", () => {
    it("should display confirmation message", () => {
      render(<DeclinedView />);

      // The heading contains "declined"
      expect(screen.getByRole("heading")).toHaveTextContent(/declined/i);
    });

    it("should have a Return to Homepage link", () => {
      render(<DeclinedView />);

      const link = screen.getByRole("link", { name: /home/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/");
    });

    it("should display a neutral message about the decline", () => {
      render(<DeclinedView />);

      expect(screen.getByRole("heading")).toBeInTheDocument();
    });
  });
});
