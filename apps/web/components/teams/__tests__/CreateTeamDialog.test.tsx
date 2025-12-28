/**
 * Tests for CreateTeamDialog component
 *
 * This dialog allows users to create a new team with name, slug, and optional description.
 * It includes form validation, slug auto-generation, and proper error handling.
 */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateTeamDialog } from "../CreateTeamDialog";
import type { TeamDetail } from "@/lib/teams/types";

// Mock the useCreateTeam hook with controllable state
let mockIsLoading = false;
let mockError: string | null = null;
const mockCreateTeam = vi.fn();
const mockReset = vi.fn();

vi.mock("@/lib/hooks/useCreateTeam", () => ({
  useCreateTeam: () => ({
    createTeam: mockCreateTeam,
    get isLoading() { return mockIsLoading; },
    get error() { return mockError; },
    reset: mockReset,
  }),
}));

const mockTeamDetail: TeamDetail = {
  id: "team-123",
  name: "Test Team",
  slug: "test-team",
  description: "A test team",
  avatarUrl: null,
  plan: "free",
  memberCount: 1,
  role: "owner",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  settings: null,
  billingEmail: null,
};

describe("CreateTeamDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockError = null;
    mockCreateTeam.mockResolvedValue(mockTeamDetail);
  });

  describe("Rendering", () => {
    it("renders when isOpen is true", () => {
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(
        <CreateTeamDialog isOpen={false} onClose={vi.fn()} />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("displays dialog title", () => {
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      expect(screen.getByRole("heading", { name: /create team/i })).toBeInTheDocument();
    });

    it("renders team name input field", () => {
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      expect(screen.getByLabelText(/team name/i)).toBeInTheDocument();
    });

    it("renders slug input field", () => {
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      expect(screen.getByLabelText(/url slug/i)).toBeInTheDocument();
    });

    it("renders description textarea", () => {
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it("renders Cancel and Create buttons", () => {
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create team/i })).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("requires team name to be filled", async () => {
      const user = userEvent.setup();
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      const createButton = screen.getByRole("button", { name: /create team/i });
      await user.click(createButton);

      expect(screen.getByText(/team name is required/i)).toBeInTheDocument();
      expect(mockCreateTeam).not.toHaveBeenCalled();
    });

    it("validates max length for team name (255 characters)", async () => {
      const user = userEvent.setup();
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      const nameInput = screen.getByLabelText(/team name/i);
      const longName = "a".repeat(256);

      await user.type(nameInput, longName);

      // The input should be truncated or show an error
      expect(nameInput).toHaveValue(longName.slice(0, 255));
    });

    it("normalizes slug format - only lowercase, numbers, and hyphens", async () => {
      const user = userEvent.setup();
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      const slugInput = screen.getByLabelText(/url slug/i);

      // Type invalid characters - they get stripped out
      await user.clear(slugInput);
      await user.type(slugInput, "My Team!");

      // Invalid chars are removed, result is lowercase
      expect(slugInput).toHaveValue("myteam");
    });

    it("allows hyphens in manually typed slug", async () => {
      const user = userEvent.setup();
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      const slugInput = screen.getByLabelText(/url slug/i);

      await user.clear(slugInput);
      await user.type(slugInput, "my-custom-slug");

      expect(slugInput).toHaveValue("my-custom-slug");
    });

    it("shows character count approaching limit for name", async () => {
      const user = userEvent.setup();
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      const nameInput = screen.getByLabelText(/team name/i);
      const longName = "a".repeat(240);

      await user.type(nameInput, longName);

      // Should show character count when approaching limit
      expect(screen.getByText(/240.*255/)).toBeInTheDocument();
    });
  });

  describe("Slug Auto-Generation", () => {
    it("auto-generates slug from team name", async () => {
      const user = userEvent.setup();
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      const nameInput = screen.getByLabelText(/team name/i);
      const slugInput = screen.getByLabelText(/url slug/i);

      await user.type(nameInput, "Marketing Team");

      expect(slugInput).toHaveValue("marketing-team");
    });

    it("converts special characters to hyphens in slug", async () => {
      const user = userEvent.setup();
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      const nameInput = screen.getByLabelText(/team name/i);
      const slugInput = screen.getByLabelText(/url slug/i);

      await user.type(nameInput, "Acme & Co!");

      expect(slugInput).toHaveValue("acme-co");
    });

    it("stops auto-generating after manual slug edit", async () => {
      const user = userEvent.setup();
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      const nameInput = screen.getByLabelText(/team name/i);
      const slugInput = screen.getByLabelText(/url slug/i);

      // Type name first
      await user.type(nameInput, "Marketing");
      expect(slugInput).toHaveValue("marketing");

      // Manually edit slug (hyphens are preserved when user types them)
      await user.clear(slugInput);
      await user.type(slugInput, "mkt-team");
      expect(slugInput).toHaveValue("mkt-team");

      // Continue typing in name - slug should not change
      await user.type(nameInput, " Team");
      expect(slugInput).toHaveValue("mkt-team");
    });

    it("trims leading and trailing hyphens from slug", async () => {
      const user = userEvent.setup();
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      const nameInput = screen.getByLabelText(/team name/i);
      const slugInput = screen.getByLabelText(/url slug/i);

      await user.type(nameInput, "  Marketing  ");

      expect(slugInput).toHaveValue("marketing");
    });
  });

  describe("Form Submission", () => {
    it("calls createTeam with form data on valid submission", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();

      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} onSuccess={onSuccess} />
      );

      const nameInput = screen.getByLabelText(/team name/i);
      const descInput = screen.getByLabelText(/description/i);
      const createButton = screen.getByRole("button", { name: /create team/i });

      await user.type(nameInput, "Test Team");
      await user.type(descInput, "A test team description");
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreateTeam).toHaveBeenCalledWith({
          name: "Test Team",
          slug: "test-team",
          description: "A test team description",
        });
      });
    });

    it("calls onSuccess callback with team data after successful creation", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();

      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} onSuccess={onSuccess} />
      );

      const nameInput = screen.getByLabelText(/team name/i);
      const createButton = screen.getByRole("button", { name: /create team/i });

      await user.type(nameInput, "Test Team");
      await user.click(createButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockTeamDetail);
      });
    });

    it("calls onClose after successful creation", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <CreateTeamDialog isOpen={true} onClose={onClose} />
      );

      const nameInput = screen.getByLabelText(/team name/i);
      const createButton = screen.getByRole("button", { name: /create team/i });

      await user.type(nameInput, "Test Team");
      await user.click(createButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe("Dialog Closing", () => {
    it("calls onClose when Cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <CreateTeamDialog isOpen={true} onClose={onClose} />
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when Escape key is pressed", () => {
      const onClose = vi.fn();

      render(
        <CreateTeamDialog isOpen={true} onClose={onClose} />
      );

      fireEvent.keyDown(document, { key: "Escape" });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when clicking overlay", () => {
      const onClose = vi.fn();

      render(
        <CreateTeamDialog isOpen={true} onClose={onClose} />
      );

      const overlay = screen.getByTestId("dialog-overlay");
      fireEvent.click(overlay);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not close when clicking dialog content", () => {
      const onClose = vi.fn();

      render(
        <CreateTeamDialog isOpen={true} onClose={onClose} />
      );

      const dialogContent = screen.getByRole("dialog");
      fireEvent.click(dialogContent);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("resets form when dialog closes", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      const nameInput = screen.getByLabelText(/team name/i);
      await user.type(nameInput, "Test Team");

      // Close and reopen dialog
      rerender(<CreateTeamDialog isOpen={false} onClose={vi.fn()} />);
      rerender(<CreateTeamDialog isOpen={true} onClose={vi.fn()} />);

      // Form should be reset
      expect(screen.getByLabelText(/team name/i)).toHaveValue("");
    });
  });

  describe("Accessibility", () => {
    it("has proper aria-modal attribute", () => {
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("has proper aria-labelledby pointing to title", () => {
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      const dialog = screen.getByRole("dialog");
      const titleId = dialog.getAttribute("aria-labelledby");

      expect(titleId).toBeTruthy();
      expect(document.getElementById(titleId!)).toHaveTextContent(/create team/i);
    });

    it("focuses first input when dialog opens", async () => {
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/team name/i)).toHaveFocus();
      });
    });

    it("labels are associated with inputs", () => {
      render(
        <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
      );

      const nameLabel = screen.getByText(/team name/i);
      const slugLabel = screen.getByText(/url slug/i);
      const descLabel = screen.getByText(/description/i);

      expect(nameLabel.tagName).toBe("LABEL");
      expect(slugLabel.tagName).toBe("LABEL");
      expect(descLabel.tagName).toBe("LABEL");
    });
  });
});

describe("CreateTeamDialog Loading State", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockError = null;
  });

  it("disables form inputs during loading", async () => {
    // Set loading state before render
    mockIsLoading = true;

    render(
      <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.getByLabelText(/team name/i)).toBeDisabled();
    expect(screen.getByLabelText(/url slug/i)).toBeDisabled();
    expect(screen.getByLabelText(/description/i)).toBeDisabled();
  });

  it("shows loading indicator on submit button during loading", async () => {
    mockIsLoading = true;

    render(
      <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
    );

    const createButton = screen.getByRole("button", { name: /creating/i });
    expect(createButton).toBeDisabled();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("does not close on Escape during loading", async () => {
    mockIsLoading = true;
    const onClose = vi.fn();

    render(
      <CreateTeamDialog isOpen={true} onClose={onClose} />
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close on overlay click during loading", async () => {
    mockIsLoading = true;
    const onClose = vi.fn();

    render(
      <CreateTeamDialog isOpen={true} onClose={onClose} />
    );

    const overlay = screen.getByTestId("dialog-overlay");
    fireEvent.click(overlay);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("disables Cancel button during loading", async () => {
    mockIsLoading = true;

    render(
      <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
  });
});

describe("CreateTeamDialog Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockError = null;
    mockCreateTeam.mockResolvedValue(mockTeamDetail);
  });

  it("displays error message when API fails", async () => {
    const errorMessage = "Team slug is already taken";
    mockCreateTeam.mockRejectedValueOnce(new Error(errorMessage));

    const user = userEvent.setup();
    render(
      <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
    );

    const nameInput = screen.getByLabelText(/team name/i);
    const createButton = screen.getByRole("button", { name: /create team/i });

    await user.type(nameInput, "Test Team");
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it("shows slug-specific error under slug field", async () => {
    const errorMessage = "Team slug is already taken";
    mockCreateTeam.mockRejectedValueOnce(new Error(errorMessage));

    const user = userEvent.setup();
    render(
      <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
    );

    const nameInput = screen.getByLabelText(/team name/i);
    const createButton = screen.getByRole("button", { name: /create team/i });

    await user.type(nameInput, "Test Team");
    await user.click(createButton);

    await waitFor(() => {
      const slugField = screen.getByLabelText(/url slug/i);
      const errorElement = slugField.parentElement?.querySelector('[role="alert"]');
      expect(errorElement).toHaveTextContent(/already taken/i);
    });
  });

  it("clears error when user starts typing again", async () => {
    const errorMessage = "Team slug is already taken";
    mockCreateTeam.mockRejectedValueOnce(new Error(errorMessage));

    const user = userEvent.setup();
    render(
      <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
    );

    const nameInput = screen.getByLabelText(/team name/i);
    const createButton = screen.getByRole("button", { name: /create team/i });

    await user.type(nameInput, "Test Team");
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Type more - error should clear
    await user.type(nameInput, " Updated");

    await waitFor(() => {
      expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
    });
  });

  it("keeps form data after error for easy retry", async () => {
    mockCreateTeam.mockRejectedValueOnce(new Error("Network error"));

    const user = userEvent.setup();
    render(
      <CreateTeamDialog isOpen={true} onClose={vi.fn()} />
    );

    const nameInput = screen.getByLabelText(/team name/i);
    const descInput = screen.getByLabelText(/description/i);
    const createButton = screen.getByRole("button", { name: /create team/i });

    await user.type(nameInput, "My Team");
    await user.type(descInput, "Team description");
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    // Form values should still be there
    expect(nameInput).toHaveValue("My Team");
    expect(descInput).toHaveValue("Team description");
  });
});
