import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AccountCard } from "../AccountCard";
import type { AdAccount } from "../../types";

const mockAccount: AdAccount = {
  id: "acc-123",
  platform: "reddit",
  accountId: "reddit-acc-456",
  accountName: "My Reddit Ads Account",
  email: "ads@mycompany.com",
  status: "connected",
  healthStatus: "healthy",
  lastSyncedAt: new Date("2024-01-15T10:30:00Z"),
  createdAt: new Date("2024-01-01T00:00:00Z"),
  campaignCount: 5,
  tokenInfo: {
    isExpired: false,
    daysUntilExpiry: 25,
  },
};

const mockAccountNoSync: AdAccount = {
  id: "acc-456",
  platform: "google",
  accountId: "google-acc-789",
  accountName: "My Google Ads Account",
  email: "google@mycompany.com",
  status: "token_expired",
  healthStatus: "warning",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  campaignCount: 3,
  tokenInfo: {
    isExpired: true,
    expiresAt: new Date("2024-01-10T00:00:00Z"),
  },
};

const mockAccountWithError: AdAccount = {
  id: "acc-789",
  platform: "facebook",
  accountId: "fb-acc-123",
  accountName: "My Facebook Ads Account",
  status: "error",
  healthStatus: "error",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  campaignCount: 0,
  errorDetails: "API rate limit exceeded. Please try again later.",
};

describe("AccountCard", () => {
  it("displays account name", () => {
    render(<AccountCard account={mockAccount} onDisconnect={vi.fn()} />);

    expect(screen.getByText("My Reddit Ads Account")).toBeInTheDocument();
  });

  it("displays platform name", () => {
    render(<AccountCard account={mockAccount} onDisconnect={vi.fn()} />);

    expect(screen.getByText("Reddit")).toBeInTheDocument();
  });

  it("displays account status", () => {
    render(<AccountCard account={mockAccount} onDisconnect={vi.fn()} />);

    // Check for the status badge (not the connection date label)
    expect(screen.getByRole("status", { name: /account status: connected/i })).toBeInTheDocument();
  });

  it("displays last synced time when available", () => {
    render(<AccountCard account={mockAccount} onDisconnect={vi.fn()} />);

    expect(screen.getByText(/Last synced/)).toBeInTheDocument();
  });

  it("does not display last synced when not available", () => {
    render(<AccountCard account={mockAccountNoSync} onDisconnect={vi.fn()} />);

    expect(screen.queryByText(/Last synced/)).not.toBeInTheDocument();
  });

  it("calls onDisconnect when disconnect button clicked", () => {
    const handleDisconnect = vi.fn();
    render(<AccountCard account={mockAccount} onDisconnect={handleDisconnect} />);

    const disconnectButton = screen.getByRole("button", { name: /disconnect/i });
    fireEvent.click(disconnectButton);

    expect(handleDisconnect).toHaveBeenCalledWith(mockAccount.id);
  });

  it("shows refresh button for connected accounts", () => {
    const handleRefresh = vi.fn();
    render(
      <AccountCard
        account={mockAccount}
        onDisconnect={vi.fn()}
        onRefresh={handleRefresh}
      />
    );

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    expect(refreshButton).toBeInTheDocument();
  });

  it("calls onRefresh when refresh button clicked", () => {
    const handleRefresh = vi.fn();
    render(
      <AccountCard
        account={mockAccount}
        onDisconnect={vi.fn()}
        onRefresh={handleRefresh}
      />
    );

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(handleRefresh).toHaveBeenCalledWith(mockAccount.id);
  });

  it("shows reconnect button for expired token", () => {
    render(
      <AccountCard
        account={mockAccountNoSync}
        onDisconnect={vi.fn()}
        onReconnect={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: /reconnect/i })
    ).toBeInTheDocument();
  });

  it("calls onReconnect when reconnect button clicked", () => {
    const handleReconnect = vi.fn();
    render(
      <AccountCard
        account={mockAccountNoSync}
        onDisconnect={vi.fn()}
        onReconnect={handleReconnect}
      />
    );

    const reconnectButton = screen.getByRole("button", { name: /reconnect/i });
    fireEvent.click(reconnectButton);

    expect(handleReconnect).toHaveBeenCalledWith(mockAccountNoSync.id);
  });

  it("displays account ID", () => {
    render(<AccountCard account={mockAccount} onDisconnect={vi.fn()} />);

    expect(screen.getByText("reddit-acc-456")).toBeInTheDocument();
  });

  it("displays account email when available", () => {
    render(<AccountCard account={mockAccount} onDisconnect={vi.fn()} />);

    expect(screen.getByText("ads@mycompany.com")).toBeInTheDocument();
  });

  it("displays campaign count", () => {
    render(<AccountCard account={mockAccount} onDisconnect={vi.fn()} />);

    expect(screen.getByText(/5 campaigns/i)).toBeInTheDocument();
  });

  it("displays singular form for one campaign", () => {
    const singleCampaignAccount = { ...mockAccount, campaignCount: 1 };
    render(<AccountCard account={singleCampaignAccount} onDisconnect={vi.fn()} />);

    expect(screen.getByText(/1 campaign/i)).toBeInTheDocument();
  });

  it("displays connection date", () => {
    render(<AccountCard account={mockAccount} onDisconnect={vi.fn()} />);

    // Check for the date value specifically
    expect(screen.getByText("Jan 1, 2024")).toBeInTheDocument();
  });

  it("displays error details when present", () => {
    render(<AccountCard account={mockAccountWithError} onDisconnect={vi.fn()} />);

    expect(screen.getByText(/API rate limit exceeded/i)).toBeInTheDocument();
  });

  it("shows health indicator with correct status", () => {
    render(<AccountCard account={mockAccount} onDisconnect={vi.fn()} />);

    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("shows warning health status for token expiring soon", () => {
    render(<AccountCard account={mockAccountNoSync} onDisconnect={vi.fn()} />);

    expect(screen.getByText("Warning")).toBeInTheDocument();
  });

  it("shows view history button when sync history exists", () => {
    const accountWithHistory = {
      ...mockAccount,
      syncHistory: [
        { id: "sync-1", timestamp: new Date(), status: "success" as const, campaignsSynced: 5 },
      ],
    };
    render(
      <AccountCard
        account={accountWithHistory}
        onDisconnect={vi.fn()}
        onViewHistory={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /view history/i })).toBeInTheDocument();
  });

  it("calls onViewHistory when view history button clicked", () => {
    const handleViewHistory = vi.fn();
    const accountWithHistory = {
      ...mockAccount,
      syncHistory: [
        { id: "sync-1", timestamp: new Date(), status: "success" as const, campaignsSynced: 5 },
      ],
    };
    render(
      <AccountCard
        account={accountWithHistory}
        onDisconnect={vi.fn()}
        onViewHistory={handleViewHistory}
      />
    );

    const historyButton = screen.getByRole("button", { name: /view history/i });
    fireEvent.click(historyButton);

    expect(handleViewHistory).toHaveBeenCalledWith(accountWithHistory.id);
  });
});
