import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteAccountModal } from "../DeleteAccountModal";
import type { DeletionPreview } from "@/lib/api/users";

// Mock the hooks
const mockFetchPreview = vi.fn();
const mockDeleteAccount = vi.fn();
const mockReset = vi.fn();

vi.mock("@/lib/hooks/useAccountDeletion", () => ({
  useDeletionPreview: () => ({
    data: mockPreviewData,
    isLoading: mockIsLoadingPreview,
    error: mockPreviewError,
    fetchPreview: mockFetchPreview,
  }),
  useDeleteAccount: () => ({
    deleteAccount: mockDeleteAccount,
    isLoading: mockIsDeleting,
    error: mockDeleteError,
    reset: mockReset,
  }),
}));

// Test data
let mockPreviewData: DeletionPreview | null = null;
let mockIsLoadingPreview = false;
let mockPreviewError: string | null = null;
let mockIsDeleting = false;
let mockDeleteError: string | null = null;

const mockFullPreview: DeletionPreview = {
  teamsToDelete: [
    { id: "team-1", name: "Personal Team", slug: "personal", memberCount: 1 },
    { id: "team-2", name: "Solo Project", slug: "solo", memberCount: 1 },
  ],
  teamsToTransfer: [
    {
      id: "team-3",
      name: "Acme Corp",
      slug: "acme",
      memberCount: 5,
      newOwner: { id: "user-2", email: "admin@acme.com", currentRole: "admin" },
    },
  ],
  teamsToLeave: [
    { id: "team-4", name: "Client Project", slug: "client" },
  ],
};

describe("DeleteAccountModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    userEmail: "test@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPreviewData = null;
    mockIsLoadingPreview = false;
    mockPreviewError = null;
    mockIsDeleting = false;
    mockDeleteError = null;
  });

  describe("Modal behavior", () => {
    it("should not render when isOpen is false", () => {
      render(<DeleteAccountModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render when isOpen is true", () => {
      mockPreviewData = mockFullPreview;
      render(<DeleteAccountModal {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should call onClose when close button is clicked", () => {
      mockPreviewData = mockFullPreview;
      const handleClose = vi.fn();
      render(<DeleteAccountModal {...defaultProps} onClose={handleClose} />);

      const closeButton = screen.getByLabelText(/close/i);
      fireEvent.click(closeButton);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when cancel button is clicked", () => {
      mockPreviewData = mockFullPreview;
      const handleClose = vi.fn();
      render(<DeleteAccountModal {...defaultProps} onClose={handleClose} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when pressing Escape key", () => {
      mockPreviewData = mockFullPreview;
      const handleClose = vi.fn();
      render(<DeleteAccountModal {...defaultProps} onClose={handleClose} />);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when clicking overlay", () => {
      mockPreviewData = mockFullPreview;
      const handleClose = vi.fn();
      render(<DeleteAccountModal {...defaultProps} onClose={handleClose} />);

      const overlay = screen.getByTestId("modal-overlay");
      fireEvent.click(overlay);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("should fetch preview when modal opens", () => {
      render(<DeleteAccountModal {...defaultProps} />);

      expect(mockFetchPreview).toHaveBeenCalledTimes(1);
    });
  });

  describe("Loading state", () => {
    it("should show loading spinner while fetching preview", () => {
      mockIsLoadingPreview = true;
      render(<DeleteAccountModal {...defaultProps} />);

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("should show error message when preview fetch fails", () => {
      mockPreviewError = "Failed to load preview";
      render(<DeleteAccountModal {...defaultProps} />);

      expect(screen.getByText(/failed to load preview/i)).toBeInTheDocument();
    });

    it("should show retry button on error", () => {
      mockPreviewError = "Network error";
      render(<DeleteAccountModal {...defaultProps} />);

      const retryButton = screen.getByRole("button", { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it("should call fetchPreview when retry button is clicked", () => {
      mockPreviewError = "Network error";
      render(<DeleteAccountModal {...defaultProps} />);

      const retryButton = screen.getByRole("button", { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockFetchPreview).toHaveBeenCalled();
    });
  });

  describe("Team lists display", () => {
    it("should display teams to be deleted", () => {
      mockPreviewData = mockFullPreview;
      render(<DeleteAccountModal {...defaultProps} />);

      expect(screen.getByText(/teams that will be deleted/i)).toBeInTheDocument();
      expect(screen.getByText("Personal Team")).toBeInTheDocument();
      expect(screen.getByText("Solo Project")).toBeInTheDocument();
    });

    it("should display member count for teams to delete", () => {
      mockPreviewData = mockFullPreview;
      render(<DeleteAccountModal {...defaultProps} />);

      expect(screen.getAllByText(/1 member/i).length).toBeGreaterThan(0);
    });

    it("should display teams to be transferred", () => {
      mockPreviewData = mockFullPreview;
      render(<DeleteAccountModal {...defaultProps} />);

      expect(screen.getByText(/ownership will be transferred/i)).toBeInTheDocument();
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText(/admin@acme.com/i)).toBeInTheDocument();
    });

    it("should display teams user will leave", () => {
      mockPreviewData = mockFullPreview;
      render(<DeleteAccountModal {...defaultProps} />);

      expect(screen.getByText(/teams you will leave/i)).toBeInTheDocument();
      expect(screen.getByText("Client Project")).toBeInTheDocument();
    });

    it("should not display empty sections", () => {
      mockPreviewData = {
        teamsToDelete: [],
        teamsToTransfer: [],
        teamsToLeave: [],
      };
      render(<DeleteAccountModal {...defaultProps} />);

      expect(screen.queryByText(/teams that will be deleted/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/ownership will be transferred/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/teams you will leave/i)).not.toBeInTheDocument();
    });
  });

  describe("Email confirmation", () => {
    it("should display email input field", () => {
      mockPreviewData = mockFullPreview;
      render(<DeleteAccountModal {...defaultProps} />);

      const input = screen.getByLabelText(/type your email/i);
      expect(input).toBeInTheDocument();
    });

    it("should disable delete button when email is empty", () => {
      mockPreviewData = mockFullPreview;
      render(<DeleteAccountModal {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete my account/i });
      expect(deleteButton).toBeDisabled();
    });

    it("should disable delete button when email does not match", async () => {
      mockPreviewData = mockFullPreview;
      const user = userEvent.setup();
      render(<DeleteAccountModal {...defaultProps} />);

      const input = screen.getByLabelText(/type your email/i);
      await user.type(input, "wrong@example.com");

      const deleteButton = screen.getByRole("button", { name: /delete my account/i });
      expect(deleteButton).toBeDisabled();
    });

    it("should enable delete button when email matches", async () => {
      mockPreviewData = mockFullPreview;
      const user = userEvent.setup();
      render(<DeleteAccountModal {...defaultProps} userEmail="test@example.com" />);

      const input = screen.getByLabelText(/type your email/i);
      await user.type(input, "test@example.com");

      const deleteButton = screen.getByRole("button", { name: /delete my account/i });
      expect(deleteButton).toBeEnabled();
    });

    it("should be case-insensitive for email matching", async () => {
      mockPreviewData = mockFullPreview;
      const user = userEvent.setup();
      render(<DeleteAccountModal {...defaultProps} userEmail="Test@Example.com" />);

      const input = screen.getByLabelText(/type your email/i);
      await user.type(input, "test@example.com");

      const deleteButton = screen.getByRole("button", { name: /delete my account/i });
      expect(deleteButton).toBeEnabled();
    });

    it("should show validation message when email does not match", async () => {
      mockPreviewData = mockFullPreview;
      const user = userEvent.setup();
      render(<DeleteAccountModal {...defaultProps} />);

      const input = screen.getByLabelText(/type your email/i);
      await user.type(input, "wrong@example.com");
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText(/email does not match/i)).toBeInTheDocument();
      });
    });
  });

  describe("Deletion flow", () => {
    it("should call deleteAccount with email when delete button is clicked", async () => {
      mockPreviewData = mockFullPreview;
      const user = userEvent.setup();
      render(<DeleteAccountModal {...defaultProps} userEmail="test@example.com" />);

      const input = screen.getByLabelText(/type your email/i);
      await user.type(input, "test@example.com");

      const deleteButton = screen.getByRole("button", { name: /delete my account/i });
      await user.click(deleteButton);

      expect(mockDeleteAccount).toHaveBeenCalledWith("test@example.com");
    });

    it("should show loading state while deleting", async () => {
      mockPreviewData = mockFullPreview;
      mockIsDeleting = true;
      const user = userEvent.setup();
      render(<DeleteAccountModal {...defaultProps} userEmail="test@example.com" />);

      const input = screen.getByLabelText(/type your email/i);
      await user.type(input, "test@example.com");

      const deleteButton = screen.getByRole("button", { name: /delete my account|deleting/i });
      expect(deleteButton).toBeDisabled();
    });

    it("should display error message when deletion fails", async () => {
      mockPreviewData = mockFullPreview;
      mockDeleteError = "Deletion failed";
      render(<DeleteAccountModal {...defaultProps} />);

      expect(screen.getByText(/deletion failed/i)).toBeInTheDocument();
    });

    it("should not close modal while deletion is in progress", () => {
      mockPreviewData = mockFullPreview;
      mockIsDeleting = true;
      const handleClose = vi.fn();
      render(<DeleteAccountModal {...defaultProps} onClose={handleClose} />);

      // Press Escape while deleting
      fireEvent.keyDown(document, { key: "Escape" });

      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper role and aria attributes", () => {
      mockPreviewData = mockFullPreview;
      render(<DeleteAccountModal {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });

    it("should have descriptive title", () => {
      mockPreviewData = mockFullPreview;
      render(<DeleteAccountModal {...defaultProps} />);

      expect(screen.getByText(/delete your account/i)).toBeInTheDocument();
    });
  });
});
