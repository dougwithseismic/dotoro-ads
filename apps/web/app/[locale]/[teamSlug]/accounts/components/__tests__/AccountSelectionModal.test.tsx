import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountSelectionModal } from "../AccountSelectionModal";
import { api } from "@/lib/api-client";

// Mock the API client
vi.mock("@/lib/api-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe("AccountSelectionModal", () => {
  const mockTeamId = "660e8400-e29b-41d4-a716-446655440001";
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  const mockBusinessesResponse = {
    businesses: [
      {
        id: "biz_1",
        name: "My Business",
        accounts: [
          {
            id: "t5_acc_1",
            name: "Account 1",
            type: "SELF_SERVE" as const,
            currency: "USD",
            alreadyConnected: false,
          },
          {
            id: "t5_acc_2",
            name: "Account 2",
            type: "MANAGED" as const,
            currency: "USD",
            alreadyConnected: true,
          },
        ],
      },
      {
        id: "biz_2",
        name: "Client Business",
        accounts: [
          {
            id: "t5_acc_3",
            name: "Client Account",
            type: "SELF_SERVE" as const,
            currency: "EUR",
            alreadyConnected: false,
          },
        ],
      },
    ],
  };

  const mockConnectResponse = {
    success: true,
    connectedCount: 2,
    connectedAccounts: [
      { id: "uuid-1", accountId: "t5_acc_1", accountName: "Account 1" },
      { id: "uuid-2", accountId: "t5_acc_3", accountName: "Client Account" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue(mockBusinessesResponse);
    mockApi.post.mockResolvedValue(mockConnectResponse);
  });

  afterEach(() => {
    vi.resetAllMocks();
    document.body.style.overflow = "";
  });

  describe("when closed", () => {
    it("should not render anything", () => {
      render(
        <AccountSelectionModal
          isOpen={false}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("when open", () => {
    it("should render the modal with title", async () => {
      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      expect(
        screen.getByText("Select Reddit Accounts")
      ).toBeInTheDocument();
    });

    it("should show loading state initially", () => {
      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText("Loading available accounts...")).toBeInTheDocument();
    });

    it("should fetch accounts when opened", async () => {
      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(
          `/api/v1/reddit/available-accounts?teamId=${mockTeamId}`
        );
      });
    });

    it("should display accounts after loading", async () => {
      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Account 1")).toBeInTheDocument();
      });

      expect(screen.getByText("Account 2")).toBeInTheDocument();
      expect(screen.getByText("Client Account")).toBeInTheDocument();
    });

    it("should show business names as section headers", async () => {
      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("My Business")).toBeInTheDocument();
      });

      expect(screen.getByText("Client Business")).toBeInTheDocument();
    });

    it("should show 'Already Connected' badge for connected accounts", async () => {
      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Already Connected")).toBeInTheDocument();
      });
    });
  });

  describe("account selection", () => {
    it("should allow selecting an account by clicking", async () => {
      const user = userEvent.setup();

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Account 1")).toBeInTheDocument();
      });

      const account1Item = screen.getByText("Account 1").closest('[role="checkbox"]');
      await user.click(account1Item!);

      expect(account1Item).toHaveAttribute("aria-checked", "true");
    });

    it("should not allow selecting already connected accounts", async () => {
      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Account 2")).toBeInTheDocument();
      });

      const account2Item = screen.getByText("Account 2").closest('[role="checkbox"]');
      expect(account2Item).toHaveAttribute("aria-disabled", "true");
    });

    it("should update selection count when accounts are selected", async () => {
      const user = userEvent.setup();

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Account 1")).toBeInTheDocument();
      });

      expect(screen.getByText("0 of 2 selected")).toBeInTheDocument();

      const account1Item = screen.getByText("Account 1").closest('[role="checkbox"]');
      await user.click(account1Item!);

      expect(screen.getByText("1 of 2 selected")).toBeInTheDocument();
    });

    it("should allow selecting all accounts with Select all button", async () => {
      const user = userEvent.setup();

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Select all")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Select all"));

      expect(screen.getByText("2 of 2 selected")).toBeInTheDocument();
    });

    it("should deselect all when Select all is clicked while all selected", async () => {
      const user = userEvent.setup();

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Select all")).toBeInTheDocument();
      });

      // Select all
      await user.click(screen.getByText("Select all"));
      expect(screen.getByText("2 of 2 selected")).toBeInTheDocument();

      // Deselect all
      await user.click(screen.getByText("Select all"));
      expect(screen.getByText("0 of 2 selected")).toBeInTheDocument();
    });
  });

  describe("connect button", () => {
    it("should be disabled when no accounts are selected", async () => {
      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Account 1")).toBeInTheDocument();
      });

      const connectButton = screen.getByRole("button", { name: /connect/i });
      expect(connectButton).toBeDisabled();
    });

    it("should be enabled when accounts are selected", async () => {
      const user = userEvent.setup();

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Account 1")).toBeInTheDocument();
      });

      const account1Item = screen.getByText("Account 1").closest('[role="checkbox"]');
      await user.click(account1Item!);

      const connectButton = screen.getByRole("button", { name: /connect.*1/i });
      expect(connectButton).not.toBeDisabled();
    });

    it("should call connect API with selected account IDs", async () => {
      const user = userEvent.setup();

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Account 1")).toBeInTheDocument();
      });

      // Select accounts
      const account1Item = screen.getByText("Account 1").closest('[role="checkbox"]');
      const account3Item = screen.getByText("Client Account").closest('[role="checkbox"]');
      await user.click(account1Item!);
      await user.click(account3Item!);

      // Click connect
      const connectButton = screen.getByRole("button", { name: /connect.*2/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          "/api/v1/reddit/connect-accounts",
          expect.objectContaining({
            teamId: mockTeamId,
            accountIds: expect.arrayContaining(["t5_acc_1", "t5_acc_3"]),
          })
        );
      });
    });

    it("should call onSuccess with connected count after successful connect", async () => {
      const user = userEvent.setup();

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Account 1")).toBeInTheDocument();
      });

      const account1Item = screen.getByText("Account 1").closest('[role="checkbox"]');
      await user.click(account1Item!);

      const connectButton = screen.getByRole("button", { name: /connect.*1/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(2);
      });
    });
  });

  describe("cancel button", () => {
    it("should call onClose when clicked", async () => {
      const user = userEvent.setup();

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("escape key", () => {
    it("should close modal on escape key", async () => {
      const user = userEvent.setup();

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("overlay click", () => {
    it("should close modal when clicking overlay", async () => {
      const user = userEvent.setup();

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Click on the overlay (parent of dialog)
      const overlay = screen.getByRole("dialog").parentElement;
      await user.click(overlay!);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should display error message when fetch fails", async () => {
      mockApi.get.mockRejectedValue(new Error("No pending OAuth session found"));

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText("No pending OAuth session found")
        ).toBeInTheDocument();
      });
    });

    it("should show retry button on fetch error", async () => {
      mockApi.get.mockRejectedValue(new Error("Network error"));

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
      });
    });

    it("should retry fetch when retry button is clicked", async () => {
      const user = userEvent.setup();
      mockApi.get
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(mockBusinessesResponse);

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Try Again" }));

      await waitFor(() => {
        expect(screen.getByText("Account 1")).toBeInTheDocument();
      });
    });

    it("should display error message when connect fails", async () => {
      const user = userEvent.setup();
      mockApi.post.mockRejectedValue(new Error("Failed to connect"));

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Account 1")).toBeInTheDocument();
      });

      const account1Item = screen.getByText("Account 1").closest('[role="checkbox"]');
      await user.click(account1Item!);

      const connectButton = screen.getByRole("button", { name: /connect.*1/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to connect")).toBeInTheDocument();
      });
    });
  });

  describe("empty state", () => {
    it("should show empty message when no accounts available", async () => {
      mockApi.get.mockResolvedValue({ businesses: [] });

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/no ad accounts found/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("search functionality", () => {
    it("should display search input when accounts are loaded", async () => {
      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search accounts...")).toBeInTheDocument();
      });
    });

    it("should filter accounts based on search query", async () => {
      const user = userEvent.setup();

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Account 1")).toBeInTheDocument();
      });

      // Type in search
      const searchInput = screen.getByPlaceholderText("Search accounts...");
      await user.type(searchInput, "Client");

      // Should only show matching account
      expect(screen.getByText("Client Account")).toBeInTheDocument();
      expect(screen.queryByText("Account 1")).not.toBeInTheDocument();
      expect(screen.queryByText("Account 2")).not.toBeInTheDocument();
    });

    it("should show no results message when search has no matches", async () => {
      const user = userEvent.setup();

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Account 1")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search accounts...");
      await user.type(searchInput, "nonexistent");

      expect(screen.getByText(/No accounts match/i)).toBeInTheDocument();
    });

    it("should show clear search button when there is a search query", async () => {
      const user = userEvent.setup();

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Account 1")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search accounts...");
      await user.type(searchInput, "test");

      expect(screen.getByLabelText("Clear search")).toBeInTheDocument();
    });

    it("should clear search when clear button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Account 1")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search accounts...");
      await user.type(searchInput, "Client");

      // Click clear button
      await user.click(screen.getByLabelText("Clear search"));

      // All accounts should be visible again
      expect(screen.getByText("Account 1")).toBeInTheDocument();
      expect(screen.getByText("Client Account")).toBeInTheDocument();
    });

    it("should show 'Select visible' instead of 'Select all' when filtering", async () => {
      const user = userEvent.setup();

      render(
        <AccountSelectionModal
          isOpen={true}
          teamId={mockTeamId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Select all")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search accounts...");
      await user.type(searchInput, "Client");

      expect(screen.getByText("Select visible")).toBeInTheDocument();
      expect(screen.queryByText("Select all")).not.toBeInTheDocument();
    });
  });
});
