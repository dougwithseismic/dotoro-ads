import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdTypeSelector } from "../AdTypeSelector";
import type { Platform } from "../../../types";

// Mock the useAdTypes hook
vi.mock("../../../hooks/useAdTypes", () => ({
  useAdTypes: vi.fn((platforms: Platform[]) => {
    const mockAdTypes = {
      google: [
        {
          id: "responsive-search",
          platform: "google",
          name: "Responsive Search Ad",
          description: "Text ads that adapt",
          category: "paid",
          icon: "search",
          fields: [],
          creatives: [],
          constraints: { characterLimits: { headline: 30 } },
          features: { supportsVariables: true, supportsMultipleAds: true, supportsKeywords: true, supportsScheduling: true },
          validate: () => ({ valid: true, errors: [], warnings: [] }),
        },
        {
          id: "responsive-display",
          platform: "google",
          name: "Responsive Display Ad",
          description: "Visual ads",
          category: "paid",
          icon: "image",
          fields: [],
          creatives: [],
          constraints: { characterLimits: {} },
          features: { supportsVariables: true, supportsMultipleAds: true, supportsKeywords: false, supportsScheduling: true },
          validate: () => ({ valid: true, errors: [], warnings: [] }),
        },
      ],
      reddit: [
        {
          id: "link",
          platform: "reddit",
          name: "Link Ad",
          description: "Drive traffic",
          category: "paid",
          icon: "link",
          fields: [],
          creatives: [],
          constraints: { characterLimits: {} },
          features: { supportsVariables: true, supportsMultipleAds: true, supportsKeywords: false, supportsScheduling: true },
          validate: () => ({ valid: true, errors: [], warnings: [] }),
        },
      ],
      facebook: [],
    };

    const result: Record<Platform, typeof mockAdTypes["google"]> = {
      google: [],
      reddit: [],
      facebook: [],
    };

    for (const platform of platforms || []) {
      result[platform] = mockAdTypes[platform] || [];
    }

    return {
      adTypes: result,
      getAdType: vi.fn((platform, id) => {
        return result[platform]?.find((t) => t.id === id);
      }),
      getRequiredFields: vi.fn(() => []),
      getCreativeRequirements: vi.fn(() => []),
      getCharacterLimits: vi.fn(() => ({})),
    };
  }),
}));

describe("AdTypeSelector", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders platform tabs for selected platforms", () => {
      render(
        <AdTypeSelector
          selectedPlatforms={["google", "reddit"]}
          selectedAdTypes={{ google: [], reddit: [], facebook: [] }}
          onChange={onChange}
        />
      );

      expect(screen.getByRole("tab", { name: /google/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /reddit/i })).toBeInTheDocument();
    });

    it("renders ad types for the active platform", () => {
      render(
        <AdTypeSelector
          selectedPlatforms={["google"]}
          selectedAdTypes={{ google: [], reddit: [], facebook: [] }}
          onChange={onChange}
        />
      );

      expect(screen.getByText("Responsive Search Ad")).toBeInTheDocument();
      expect(screen.getByText("Responsive Display Ad")).toBeInTheDocument();
    });

    it("shows empty state when no platforms selected", () => {
      render(
        <AdTypeSelector
          selectedPlatforms={[]}
          selectedAdTypes={{ google: [], reddit: [], facebook: [] }}
          onChange={onChange}
        />
      );

      expect(screen.getByText(/select a platform first/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Tab Navigation Tests
  // ==========================================================================

  describe("Tab Navigation", () => {
    it("switches to different platform when tab is clicked", async () => {
      const user = userEvent.setup();

      render(
        <AdTypeSelector
          selectedPlatforms={["google", "reddit"]}
          selectedAdTypes={{ google: [], reddit: [], facebook: [] }}
          onChange={onChange}
        />
      );

      // Initially shows Google ad types
      expect(screen.getByText("Responsive Search Ad")).toBeInTheDocument();

      // Click Reddit tab
      await user.click(screen.getByRole("tab", { name: /reddit/i }));

      // Now shows Reddit ad types
      expect(screen.getByText("Link Ad")).toBeInTheDocument();
    });

    it("shows first platform by default", () => {
      render(
        <AdTypeSelector
          selectedPlatforms={["reddit", "google"]}
          selectedAdTypes={{ google: [], reddit: [], facebook: [] }}
          onChange={onChange}
        />
      );

      // Reddit is first, so it should be active
      const redditTab = screen.getByRole("tab", { name: /reddit/i });
      expect(redditTab).toHaveAttribute("aria-selected", "true");
    });
  });

  // ==========================================================================
  // Selection Tests
  // ==========================================================================

  describe("Selection", () => {
    it("marks selected ad types as checked", () => {
      render(
        <AdTypeSelector
          selectedPlatforms={["google"]}
          selectedAdTypes={{ google: ["responsive-search"], reddit: [], facebook: [] }}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("ad-type-card-responsive-search")).toHaveAttribute(
        "aria-checked",
        "true"
      );
      expect(screen.getByTestId("ad-type-card-responsive-display")).toHaveAttribute(
        "aria-checked",
        "false"
      );
    });

    it("calls onChange when an ad type is selected", async () => {
      const user = userEvent.setup();

      render(
        <AdTypeSelector
          selectedPlatforms={["google"]}
          selectedAdTypes={{ google: [], reddit: [], facebook: [] }}
          onChange={onChange}
        />
      );

      await user.click(screen.getByTestId("ad-type-card-responsive-search"));

      expect(onChange).toHaveBeenCalledWith({
        google: ["responsive-search"],
        reddit: [],
        facebook: [],
      });
    });

    it("calls onChange to deselect when clicking a selected ad type", async () => {
      const user = userEvent.setup();

      render(
        <AdTypeSelector
          selectedPlatforms={["google"]}
          selectedAdTypes={{ google: ["responsive-search"], reddit: [], facebook: [] }}
          onChange={onChange}
        />
      );

      await user.click(screen.getByTestId("ad-type-card-responsive-search"));

      expect(onChange).toHaveBeenCalledWith({
        google: [],
        reddit: [],
        facebook: [],
      });
    });

    it("preserves other platforms selections when changing one", async () => {
      const user = userEvent.setup();

      render(
        <AdTypeSelector
          selectedPlatforms={["google"]}
          selectedAdTypes={{ google: [], reddit: ["link"], facebook: [] }}
          onChange={onChange}
        />
      );

      await user.click(screen.getByTestId("ad-type-card-responsive-search"));

      expect(onChange).toHaveBeenCalledWith({
        google: ["responsive-search"],
        reddit: ["link"], // Reddit selection preserved
        facebook: [],
      });
    });
  });

  // ==========================================================================
  // Count Badge Tests
  // ==========================================================================

  describe("Count Badges", () => {
    it("shows count of selected ad types per platform", () => {
      render(
        <AdTypeSelector
          selectedPlatforms={["google", "reddit"]}
          selectedAdTypes={{ google: ["responsive-search", "responsive-display"], reddit: ["link"], facebook: [] }}
          onChange={onChange}
        />
      );

      // Google has 2 selected
      expect(screen.getByTestId("count-badge-google")).toHaveTextContent("2");
      // Reddit has 1 selected
      expect(screen.getByTestId("count-badge-reddit")).toHaveTextContent("1");
    });

    it("hides count badge when no ad types selected", () => {
      render(
        <AdTypeSelector
          selectedPlatforms={["google"]}
          selectedAdTypes={{ google: [], reddit: [], facebook: [] }}
          onChange={onChange}
        />
      );

      expect(screen.queryByTestId("count-badge-google")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has accessible group labels", () => {
      render(
        <AdTypeSelector
          selectedPlatforms={["google"]}
          selectedAdTypes={{ google: [], reddit: [], facebook: [] }}
          onChange={onChange}
        />
      );

      expect(screen.getByRole("group", { name: /select ad types/i })).toBeInTheDocument();
    });

    it("supports keyboard navigation between tabs", async () => {
      const user = userEvent.setup();

      render(
        <AdTypeSelector
          selectedPlatforms={["google", "reddit"]}
          selectedAdTypes={{ google: [], reddit: [], facebook: [] }}
          onChange={onChange}
        />
      );

      const googleTab = screen.getByRole("tab", { name: /google/i });
      googleTab.focus();

      await user.keyboard("{ArrowRight}");

      // Reddit tab should now be selected
      const redditTab = screen.getByRole("tab", { name: /reddit/i });
      expect(redditTab).toHaveAttribute("aria-selected", "true");
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles platform with no ad types gracefully", () => {
      render(
        <AdTypeSelector
          selectedPlatforms={["facebook"]}
          selectedAdTypes={{ google: [], reddit: [], facebook: [] }}
          onChange={onChange}
        />
      );

      expect(screen.getByText(/no ad types available/i)).toBeInTheDocument();
    });

    it("handles undefined selectedAdTypes gracefully", () => {
      render(
        <AdTypeSelector
          selectedPlatforms={["google"]}
          selectedAdTypes={undefined as unknown as Record<Platform, string[]>}
          onChange={onChange}
        />
      );

      // Should render without crashing
      expect(screen.getByText("Responsive Search Ad")).toBeInTheDocument();
    });
  });
});
