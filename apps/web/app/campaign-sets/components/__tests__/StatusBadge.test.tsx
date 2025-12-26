import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "../StatusBadge";
import type { CampaignSetStatus, CampaignStatus } from "../../types";

describe("StatusBadge", () => {
  describe("CampaignSetStatus rendering", () => {
    const campaignSetStatuses: CampaignSetStatus[] = [
      "draft",
      "pending",
      "syncing",
      "active",
      "paused",
      "completed",
      "archived",
      "error",
    ];

    it.each(campaignSetStatuses)(
      "renders %s status with correct label and data attribute",
      (status) => {
        const { container } = render(<StatusBadge status={status} />);

        const badge = container.firstChild as HTMLElement;
        expect(badge).toHaveAttribute("data-status", status);
        expect(screen.getByRole("status")).toBeInTheDocument();
      }
    );

    it("displays Draft label for draft status", () => {
      render(<StatusBadge status="draft" />);
      expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("displays Pending label for pending status", () => {
      render(<StatusBadge status="pending" />);
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("displays Syncing label for syncing status", () => {
      render(<StatusBadge status="syncing" />);
      expect(screen.getByText("Syncing")).toBeInTheDocument();
    });

    it("displays Active label for active status", () => {
      render(<StatusBadge status="active" />);
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("displays Paused label for paused status", () => {
      render(<StatusBadge status="paused" />);
      expect(screen.getByText("Paused")).toBeInTheDocument();
    });

    it("displays Completed label for completed status", () => {
      render(<StatusBadge status="completed" />);
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("displays Archived label for archived status", () => {
      render(<StatusBadge status="archived" />);
      expect(screen.getByText("Archived")).toBeInTheDocument();
    });

    it("displays Error label for error status", () => {
      render(<StatusBadge status="error" />);
      expect(screen.getByText("Error")).toBeInTheDocument();
    });
  });

  describe("CampaignStatus rendering", () => {
    const campaignStatuses: CampaignStatus[] = [
      "draft",
      "pending",
      "active",
      "paused",
      "completed",
      "error",
    ];

    it.each(campaignStatuses)(
      "renders campaign status %s correctly",
      (status) => {
        const { container } = render(<StatusBadge status={status} />);

        const badge = container.firstChild as HTMLElement;
        expect(badge).toHaveAttribute("data-status", status);
      }
    );
  });

  describe("Size variants", () => {
    it("renders default (md) size when size is not specified", () => {
      const { container } = render(<StatusBadge status="active" />);

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveAttribute("data-size", "md");
    });

    it("renders small size when size is sm", () => {
      const { container } = render(<StatusBadge status="active" size="sm" />);

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveAttribute("data-size", "sm");
    });

    it("renders medium size when size is md", () => {
      const { container } = render(<StatusBadge status="active" size="md" />);

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveAttribute("data-size", "md");
    });
  });

  describe("Accessibility", () => {
    it("has role=status for screen readers", () => {
      render(<StatusBadge status="active" />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("has aria-label matching the status label", () => {
      render(<StatusBadge status="active" />);

      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("aria-label", "Active");
    });

    it("includes SVG icon with aria-hidden", () => {
      const { container } = render(<StatusBadge status="active" />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Icon rendering", () => {
    it("renders icon for each status", () => {
      const statuses: CampaignSetStatus[] = [
        "draft",
        "pending",
        "syncing",
        "active",
        "paused",
        "completed",
        "archived",
        "error",
      ];

      statuses.forEach((status) => {
        const { container, unmount } = render(<StatusBadge status={status} />);
        expect(container.querySelector("svg")).toBeInTheDocument();
        unmount();
      });
    });

    it("applies spinner animation class for syncing status", () => {
      const { container } = render(<StatusBadge status="syncing" />);

      const svg = container.querySelector("svg");
      expect(svg?.classList.toString()).toContain("spinner");
    });
  });
});
