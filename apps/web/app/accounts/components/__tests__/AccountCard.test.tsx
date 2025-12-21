import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AccountCard } from "../AccountCard";
import type { AdAccount } from "../../types";

const mockAccount: AdAccount = {
  id: "acc-123",
  platform: "reddit",
  accountId: "reddit-acc-456",
  accountName: "My Reddit Ads Account",
  status: "connected",
  lastSyncedAt: new Date("2024-01-15T10:30:00Z"),
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

const mockAccountNoSync: AdAccount = {
  id: "acc-456",
  platform: "google",
  accountId: "google-acc-789",
  accountName: "My Google Ads Account",
  status: "token_expired",
  createdAt: new Date("2024-01-01T00:00:00Z"),
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

    expect(screen.getByText("Connected")).toBeInTheDocument();
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
});
