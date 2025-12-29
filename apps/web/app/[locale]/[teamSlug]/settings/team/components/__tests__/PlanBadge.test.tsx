import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanBadge } from "../PlanBadge";

describe("PlanBadge", () => {
  describe("rendering", () => {
    it("renders with free plan", () => {
      render(<PlanBadge plan="free" />);

      expect(screen.getByText("Free")).toBeInTheDocument();
      expect(screen.getByTestId("plan-badge")).toHaveAttribute(
        "data-plan",
        "free"
      );
    });

    it("renders with pro plan", () => {
      render(<PlanBadge plan="pro" />);

      expect(screen.getByText("Pro")).toBeInTheDocument();
      expect(screen.getByTestId("plan-badge")).toHaveAttribute(
        "data-plan",
        "pro"
      );
    });

    it("renders with enterprise plan", () => {
      render(<PlanBadge plan="enterprise" />);

      expect(screen.getByText("Enterprise")).toBeInTheDocument();
      expect(screen.getByTestId("plan-badge")).toHaveAttribute(
        "data-plan",
        "enterprise"
      );
    });
  });

  describe("styling", () => {
    it("applies neutral/gray styling for free plan", () => {
      render(<PlanBadge plan="free" />);

      const badge = screen.getByTestId("plan-badge");
      expect(badge.className).toContain("bg-neutral");
    });

    it("applies blue/primary styling for pro plan", () => {
      render(<PlanBadge plan="pro" />);

      const badge = screen.getByTestId("plan-badge");
      expect(badge.className).toContain("bg-blue");
    });

    it("applies purple/premium styling for enterprise plan", () => {
      render(<PlanBadge plan="enterprise" />);

      const badge = screen.getByTestId("plan-badge");
      expect(badge.className).toContain("bg-purple");
    });
  });

  describe("icons", () => {
    it("shows sparkle icon for pro plan", () => {
      render(<PlanBadge plan="pro" showIcon />);

      expect(screen.getByTestId("plan-icon")).toBeInTheDocument();
    });

    it("shows crown icon for enterprise plan", () => {
      render(<PlanBadge plan="enterprise" showIcon />);

      expect(screen.getByTestId("plan-icon")).toBeInTheDocument();
    });

    it("does not show icon when showIcon is false", () => {
      render(<PlanBadge plan="pro" showIcon={false} />);

      expect(screen.queryByTestId("plan-icon")).not.toBeInTheDocument();
    });

    it("does not show icon for free plan", () => {
      render(<PlanBadge plan="free" showIcon />);

      // Free plan doesn't have an icon
      expect(screen.queryByTestId("plan-icon")).not.toBeInTheDocument();
    });
  });

  describe("size variants", () => {
    it("renders with default (medium) size", () => {
      render(<PlanBadge plan="free" />);

      const badge = screen.getByTestId("plan-badge");
      expect(badge.className).toContain("text-xs");
    });

    it("renders with small size", () => {
      render(<PlanBadge plan="free" size="sm" />);

      const badge = screen.getByTestId("plan-badge");
      expect(badge.className).toContain("text-xs");
    });

    it("renders with large size", () => {
      render(<PlanBadge plan="free" size="lg" />);

      const badge = screen.getByTestId("plan-badge");
      expect(badge.className).toContain("text-sm");
    });
  });

  describe("accessibility", () => {
    it("has appropriate aria-label", () => {
      render(<PlanBadge plan="pro" />);

      const badge = screen.getByTestId("plan-badge");
      expect(badge).toHaveAttribute("aria-label", "Pro plan");
    });
  });
});
