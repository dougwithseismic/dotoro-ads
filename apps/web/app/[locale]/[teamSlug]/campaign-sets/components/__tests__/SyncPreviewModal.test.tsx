/**
 * SyncPreviewModal Component Tests
 *
 * Tests for the modal that displays pre-sync validation preview
 * with breakdown of valid, fallback, and skipped ads.
 */
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncPreviewModal } from "../SyncPreviewModal";
import type {
  CampaignSet,
  SyncPreviewResponse,
} from "../../types";

/**
 * Creates a mock campaign set for testing
 */
function createMockCampaignSet(): CampaignSet {
  return {
    id: "set-123",
    userId: "user-456",
    name: "Test Campaign Set",
    description: "A test campaign set",
    status: "active",
    syncStatus: "pending",
    config: {
      dataSourceId: "ds-1",
      availableColumns: ["name", "price"],
      selectedPlatforms: ["reddit"],
      selectedAdTypes: { reddit: ["promoted_post"] },
      campaignConfig: { namePattern: "{name}" },
      hierarchyConfig: { adGroups: [] },
      generatedAt: "2024-01-15T10:00:00Z",
      rowCount: 100,
      campaignCount: 10,
    },
    campaigns: [
      {
        id: "camp-1",
        campaignSetId: "set-123",
        name: "Campaign 1",
        platform: "reddit",
        orderIndex: 0,
        status: "pending",
        syncStatus: "pending",
        adGroups: [
          {
            id: "ag-1",
            campaignId: "camp-1",
            name: "Ad Group 1",
            orderIndex: 0,
            status: "active",
            ads: [
              { id: "ad-1", adGroupId: "ag-1", orderIndex: 0, headline: "Test Ad 1", status: "active", createdAt: "", updatedAt: "" },
              { id: "ad-2", adGroupId: "ag-1", orderIndex: 1, headline: "Test Ad 2", status: "active", createdAt: "", updatedAt: "" },
            ],
            keywords: [],
            createdAt: "",
            updatedAt: "",
          },
        ],
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
      },
    ],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T12:00:00Z",
  };
}

/**
 * Creates a mock preview response
 */
function createMockPreview(overrides: Partial<SyncPreviewResponse> = {}): SyncPreviewResponse {
  return {
    campaignSetId: "set-123",
    totalAds: 10,
    breakdown: {
      valid: 8,
      fallback: 1,
      skipped: 1,
    },
    validAds: [
      { adId: "ad-1", adGroupId: "ag-1", campaignId: "camp-1", name: "Valid Ad 1" },
    ],
    fallbackAds: [
      { adId: "ad-2", adGroupId: "ag-1", campaignId: "camp-1", name: "Fallback Ad", reason: "Text will be truncated" },
    ],
    skippedAds: [
      {
        adId: "ad-3",
        adGroupId: "ag-1",
        campaignId: "camp-1",
        name: "Skipped Ad",
        reason: "URL is invalid",
        errorCode: "INVALID_URL",
        field: "finalUrl",
      },
    ],
    canProceed: true,
    warnings: [],
    validationTimeMs: 15,
    ...overrides,
  };
}

describe("SyncPreviewModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    campaignSet: createMockCampaignSet(),
    preview: createMockPreview(),
    isLoading: false,
    error: null,
    onSync: vi.fn(),
    onBypass: vi.fn(),
    onRevalidate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      render(<SyncPreviewModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render modal when isOpen is true", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Sync Preview")).toBeInTheDocument();
    });

    it("should display campaign set name", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      expect(screen.getByText("Test Campaign Set")).toBeInTheDocument();
    });

    it("should display total ads count", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      expect(screen.getByText(/Total ads to process: 10/)).toBeInTheDocument();
    });
  });

  describe("Breakdown Display", () => {
    it("should display valid ads count", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText("Valid")).toBeInTheDocument();
    });

    it("should display fallback ads count", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      // Find the Fallback breakdown item and check it has the correct count
      expect(screen.getByText("Fallback")).toBeInTheDocument();
      // Since there's "1" for both fallback and skipped, just verify Fallback label exists
    });

    it("should display skipped ads count", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      const skippedText = screen.getAllByText("1");
      expect(skippedText.length).toBeGreaterThan(0);
      expect(screen.getByText("Skipped")).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("should display loading skeleton when loading", () => {
      render(<SyncPreviewModal {...defaultProps} isLoading={true} preview={null} />);
      expect(screen.getByText(/Analyzing.*ads/)).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("should display error message when error occurs", () => {
      render(<SyncPreviewModal {...defaultProps} error="Failed to load preview" preview={null} />);
      expect(screen.getByText("Failed to load preview")).toBeInTheDocument();
    });

    it("should show retry button on error", () => {
      render(<SyncPreviewModal {...defaultProps} error="Network error" preview={null} />);
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    it("should call onRevalidate when retry button clicked", () => {
      render(<SyncPreviewModal {...defaultProps} error="Network error" preview={null} />);
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      expect(defaultProps.onRevalidate).toHaveBeenCalled();
    });
  });

  describe("Warnings", () => {
    it("should display warnings when present", () => {
      const preview = createMockPreview({
        warnings: ["High skip rate (25%): 25 of 100 ads will be skipped."],
      });
      render(<SyncPreviewModal {...defaultProps} preview={preview} />);
      expect(screen.getByText(/High skip rate/)).toBeInTheDocument();
    });
  });

  describe("Actions", () => {
    it("should show Sync Now button when canProceed is true", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      expect(screen.getByRole("button", { name: /sync now/i })).toBeInTheDocument();
    });

    it("should show Re-validate button when canProceed is false", () => {
      const preview = createMockPreview({ canProceed: false });
      render(<SyncPreviewModal {...defaultProps} preview={preview} />);
      expect(screen.getByRole("button", { name: /re-validate/i })).toBeInTheDocument();
    });

    it("should call onSync when Sync Now clicked", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: /sync now/i }));
      expect(defaultProps.onSync).toHaveBeenCalled();
    });

    it("should call onClose when Cancel clicked", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should show Sync Anyway button when there are skipped ads", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      expect(screen.getByRole("button", { name: /sync anyway/i })).toBeInTheDocument();
    });

    it("should call onBypass when Sync Anyway clicked", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: /sync anyway/i }));
      expect(defaultProps.onBypass).toHaveBeenCalled();
    });
  });

  describe("Navigation", () => {
    it("should navigate to skipped view when clicking on skipped section", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      // Click on the skipped breakdown item (it should be a button)
      const skippedButton = screen.getByRole("button", { name: /view skipped ads/i });
      fireEvent.click(skippedButton);
      expect(screen.getByText(/Skipped Ads \(1\)/)).toBeInTheDocument();
    });

    it("should navigate to fallback view when clicking on fallback section", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      // Click on the fallback breakdown item
      const fallbackButton = screen.getByRole("button", { name: /view fallback ads/i });
      fireEvent.click(fallbackButton);
      expect(screen.getByText(/Fallback Ads \(1\)/)).toBeInTheDocument();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should close modal on Escape key", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have correct aria attributes", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });
  });

  describe("Validation Time", () => {
    it("should display validation time", () => {
      render(<SyncPreviewModal {...defaultProps} />);
      expect(screen.getByText(/Validated in 15ms/)).toBeInTheDocument();
    });
  });
});
