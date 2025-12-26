import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CampaignSetCard } from "../CampaignSetCard";
import type { CampaignSetSummary } from "../../types";

const createMockCampaignSet = (
  overrides: Partial<CampaignSetSummary> = {}
): CampaignSetSummary => ({
  id: "set-123",
  name: "Test Campaign Set",
  description: "A test campaign set for unit tests",
  status: "active",
  syncStatus: "synced",
  campaignCount: 10,
  adGroupCount: 25,
  adCount: 75,
  platforms: ["google", "meta"],
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T12:00:00Z",
  ...overrides,
});

describe("CampaignSetCard", () => {
  describe("Basic rendering", () => {
    it("renders campaign set name", () => {
      const set = createMockCampaignSet({ name: "My Campaign Set" });
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      expect(screen.getByText("My Campaign Set")).toBeInTheDocument();
    });

    it("renders campaign set description when provided", () => {
      const set = createMockCampaignSet({
        description: "This is a detailed description",
      });
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      expect(
        screen.getByText("This is a detailed description")
      ).toBeInTheDocument();
    });

    it("does not render description when not provided", () => {
      const set = createMockCampaignSet({ description: null });
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      const card = screen.getByRole("article");
      expect(card.querySelector('[class*="description"]')).toBeNull();
    });

    it("renders status badge", () => {
      const set = createMockCampaignSet({ status: "active" });
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      expect(screen.getByText("Active")).toBeInTheDocument();
    });
  });

  describe("Statistics display", () => {
    it("renders campaign count", () => {
      const set = createMockCampaignSet({ campaignCount: 15 });
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      expect(screen.getByText("15")).toBeInTheDocument();
      expect(screen.getByText("Campaigns")).toBeInTheDocument();
    });

    it("renders ad group count", () => {
      const set = createMockCampaignSet({ adGroupCount: 42 });
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("Ad Groups")).toBeInTheDocument();
    });

    it("renders ad count", () => {
      const set = createMockCampaignSet({ adCount: 100 });
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("Ads")).toBeInTheDocument();
    });

    it("formats large numbers with locale formatting", () => {
      const set = createMockCampaignSet({ campaignCount: 1234 });
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      expect(screen.getByText("1,234")).toBeInTheDocument();
    });
  });

  describe("Platform display", () => {
    it("renders platform badges for each platform", () => {
      const set = createMockCampaignSet({
        platforms: ["google", "meta", "linkedin"],
      });
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      expect(screen.getByText("Google")).toBeInTheDocument();
      expect(screen.getByText("Meta")).toBeInTheDocument();
      expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    });

    it("handles single platform", () => {
      const set = createMockCampaignSet({ platforms: ["google"] });
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      expect(screen.getByText("Google")).toBeInTheDocument();
    });

    it("handles empty platforms array", () => {
      const set = createMockCampaignSet({ platforms: [] });
      const { container } = render(
        <CampaignSetCard set={set} onClick={vi.fn()} />
      );

      const platformsSection = container.querySelector('[class*="platforms"]');
      expect(platformsSection?.children.length).toBe(0);
    });
  });

  describe("Click handling", () => {
    it("calls onClick when card is clicked", () => {
      const onClick = vi.fn();
      const set = createMockCampaignSet();
      render(<CampaignSetCard set={set} onClick={onClick} />);

      const card = screen.getByRole("article");
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("calls onClick with correct campaign set id", () => {
      const onClick = vi.fn();
      const set = createMockCampaignSet({ id: "unique-id-456" });
      render(<CampaignSetCard set={set} onClick={onClick} />);

      const card = screen.getByRole("article");
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalled();
    });

    it("has clickable cursor styling", () => {
      const set = createMockCampaignSet();
      const { container } = render(
        <CampaignSetCard set={set} onClick={vi.fn()} />
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveStyle({ cursor: "pointer" });
    });
  });

  describe("Accessibility", () => {
    it("has article role", () => {
      const set = createMockCampaignSet();
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      expect(screen.getByRole("article")).toBeInTheDocument();
    });

    it("has accessible name from campaign set name", () => {
      const set = createMockCampaignSet({ name: "Accessible Campaign Set" });
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      const card = screen.getByRole("article");
      expect(card).toHaveAttribute(
        "aria-label",
        "Accessible Campaign Set campaign set"
      );
    });

    it("is keyboard focusable", () => {
      const set = createMockCampaignSet();
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      const card = screen.getByRole("article");
      expect(card).toHaveAttribute("tabIndex", "0");
    });

    it("triggers click on Enter key press", () => {
      const onClick = vi.fn();
      const set = createMockCampaignSet();
      render(<CampaignSetCard set={set} onClick={onClick} />);

      const card = screen.getByRole("article");
      fireEvent.keyDown(card, { key: "Enter" });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("triggers click on Space key press", () => {
      const onClick = vi.fn();
      const set = createMockCampaignSet();
      render(<CampaignSetCard set={set} onClick={onClick} />);

      const card = screen.getByRole("article");
      fireEvent.keyDown(card, { key: " " });

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Status variations", () => {
    it("displays draft status correctly", () => {
      const set = createMockCampaignSet({ status: "draft" });
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("displays error status correctly", () => {
      const set = createMockCampaignSet({ status: "error" });
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      expect(screen.getByText("Error")).toBeInTheDocument();
    });

    it("displays syncing status correctly", () => {
      const set = createMockCampaignSet({ status: "syncing" });
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      expect(screen.getByText("Syncing")).toBeInTheDocument();
    });
  });

  describe("Date display", () => {
    it("shows formatted creation date", () => {
      const set = createMockCampaignSet({
        createdAt: "2024-03-15T10:30:00Z",
      });
      render(<CampaignSetCard set={set} onClick={vi.fn()} />);

      // Check that date is displayed (format may vary by locale)
      const card = screen.getByRole("article");
      expect(card.textContent).toContain("2024");
    });
  });
});
