/**
 * Tests for CreateTeamAction component
 *
 * Tests the dashboard quick action button that opens the CreateTeamDialog.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateTeamAction } from "../CreateTeamAction";

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => ({
    locale: "en",
  }),
}));

// Mock the CreateTeamDialog to simplify testing
let mockIsOpen = false;
let mockOnClose: (() => void) | null = null;
let mockOnSuccess: ((team: { id: string }) => void) | null = null;

vi.mock("@/components/teams/CreateTeamDialog", () => ({
  CreateTeamDialog: ({
    isOpen,
    onClose,
    onSuccess,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (team: { id: string }) => void;
  }) => {
    mockIsOpen = isOpen;
    mockOnClose = onClose;
    mockOnSuccess = onSuccess;

    if (!isOpen) return null;

    return (
      <div data-testid="create-team-dialog" role="dialog">
        <button onClick={() => onSuccess({ id: "team-123" })}>
          Create Team
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  },
}));

describe("CreateTeamAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOpen = false;
    mockOnClose = null;
    mockOnSuccess = null;
  });

  it("renders the create team action button", () => {
    render(<CreateTeamAction />);

    expect(screen.getByTestId("create-team-action")).toBeInTheDocument();
    expect(screen.getByText("Create Team")).toBeInTheDocument();
    expect(screen.getByText("Start a new team workspace")).toBeInTheDocument();
  });

  it("opens the dialog when button is clicked", async () => {
    const user = userEvent.setup();
    render(<CreateTeamAction />);

    const button = screen.getByTestId("create-team-action");
    await user.click(button);

    expect(screen.getByTestId("create-team-dialog")).toBeInTheDocument();
  });

  it("closes the dialog when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<CreateTeamAction />);

    // Open dialog
    await user.click(screen.getByTestId("create-team-action"));
    expect(screen.getByTestId("create-team-dialog")).toBeInTheDocument();

    // Click cancel
    await user.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(screen.queryByTestId("create-team-dialog")).not.toBeInTheDocument();
    });
  });

  it("navigates to team settings on successful creation", async () => {
    const user = userEvent.setup();
    render(<CreateTeamAction />);

    // Open dialog
    await user.click(screen.getByTestId("create-team-action"));

    // Create team
    await user.click(screen.getByRole("button", { name: "Create Team" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/en/settings/team?teamId=team-123");
    });
  });

  it("uses correct locale in navigation path", async () => {
    const user = userEvent.setup();
    render(<CreateTeamAction />);

    // Open dialog
    await user.click(screen.getByTestId("create-team-action"));

    // Create team
    await user.click(screen.getByRole("button", { name: "Create Team" }));

    // Verify path includes locale
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/en/"));
    });
  });

  it("has team icon in the action button", () => {
    render(<CreateTeamAction />);

    // The button should contain an SVG icon
    const button = screen.getByTestId("create-team-action");
    const icon = button.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("has accessible button role", () => {
    render(<CreateTeamAction />);

    expect(screen.getByRole("button", { name: /create team/i })).toBeInTheDocument();
  });
});
