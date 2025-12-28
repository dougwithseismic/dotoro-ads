/**
 * SuccessView Component Tests
 *
 * TDD tests for the success state after accepting an invitation.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SuccessView } from "../SuccessView";

describe("SuccessView", () => {
  const defaultProps = {
    teamName: "Acme Corporation",
    teamSlug: "acme-corp",
    role: "editor" as const,
  };

  describe("Welcome Message", () => {
    it("should display welcome message with team name", () => {
      render(<SuccessView {...defaultProps} />);

      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
      expect(screen.getByText(/Acme Corporation/)).toBeInTheDocument();
    });

    it("should have a heading with welcome message", () => {
      render(<SuccessView {...defaultProps} />);

      const heading = screen.getByRole("heading");
      expect(heading).toBeInTheDocument();
    });
  });

  describe("Success Icon", () => {
    it("should display a success checkmark icon", () => {
      render(<SuccessView {...defaultProps} />);

      const icon = screen.getByTestId("success-icon");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Role Display", () => {
    it("should show the assigned role", () => {
      render(<SuccessView {...defaultProps} />);

      expect(screen.getByText(/editor/i)).toBeInTheDocument();
    });

    it("should display role assignment message", () => {
      render(<SuccessView {...defaultProps} />);

      expect(screen.getByText(/joined as/i)).toBeInTheDocument();
    });

    it("should show Admin role correctly", () => {
      render(<SuccessView {...defaultProps} role="admin" />);

      expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });

    it("should show Viewer role correctly", () => {
      render(<SuccessView {...defaultProps} role="viewer" />);

      expect(screen.getByText(/viewer/i)).toBeInTheDocument();
    });
  });

  describe("Call to Action", () => {
    it("should have a primary CTA button for team dashboard", () => {
      render(<SuccessView {...defaultProps} />);

      const ctaButton = screen.getByRole("link", { name: /go to.*dashboard|team/i });
      expect(ctaButton).toBeInTheDocument();
    });

    it("should link to the correct team URL", () => {
      render(<SuccessView {...defaultProps} />);

      const ctaLink = screen.getByRole("link", { name: /go to.*dashboard|team/i });
      expect(ctaLink).toHaveAttribute("href", expect.stringContaining("acme-corp"));
    });
  });

  describe("Accessibility", () => {
    it("should have accessible heading structure", () => {
      render(<SuccessView {...defaultProps} />);

      const heading = screen.getByRole("heading");
      expect(heading).toBeInTheDocument();
    });

    it("should have alt text for success icon", () => {
      render(<SuccessView {...defaultProps} />);

      const icon = screen.getByTestId("success-icon");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Styling", () => {
    it("should have a centered container", () => {
      render(<SuccessView {...defaultProps} />);

      const container = screen.getByTestId("success-container");
      expect(container).toBeInTheDocument();
    });
  });
});
