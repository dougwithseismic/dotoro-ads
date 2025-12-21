import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AccountsList } from "../AccountsList";
import type { AdAccount } from "../../types";

const mockAccounts: AdAccount[] = [
  {
    id: "acc-1",
    platform: "reddit",
    accountId: "reddit-123",
    accountName: "Reddit Account 1",
    status: "connected",
    lastSyncedAt: new Date("2024-01-15T10:30:00Z"),
    createdAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: "acc-2",
    platform: "google",
    accountId: "google-456",
    accountName: "Google Account 1",
    status: "token_expired",
    createdAt: new Date("2024-01-02T00:00:00Z"),
  },
];

describe("AccountsList", () => {
  it("renders all accounts", () => {
    render(
      <AccountsList
        accounts={mockAccounts}
        onDisconnect={vi.fn()}
        onRefresh={vi.fn()}
        onReconnect={vi.fn()}
      />
    );

    expect(screen.getByText("Reddit Account 1")).toBeInTheDocument();
    expect(screen.getByText("Google Account 1")).toBeInTheDocument();
  });

  it("shows empty state when no accounts", () => {
    render(
      <AccountsList
        accounts={[]}
        onDisconnect={vi.fn()}
        onRefresh={vi.fn()}
        onReconnect={vi.fn()}
      />
    );

    expect(screen.getByText(/no accounts connected/i)).toBeInTheDocument();
  });

  it("calls onDisconnect with correct id", () => {
    const handleDisconnect = vi.fn();
    render(
      <AccountsList
        accounts={mockAccounts}
        onDisconnect={handleDisconnect}
        onRefresh={vi.fn()}
        onReconnect={vi.fn()}
      />
    );

    const disconnectButtons = screen.getAllByRole("button", {
      name: /disconnect/i,
    });
    fireEvent.click(disconnectButtons[0]);

    expect(handleDisconnect).toHaveBeenCalledWith("acc-1");
  });

  it("calls onRefresh with correct id", () => {
    const handleRefresh = vi.fn();
    render(
      <AccountsList
        accounts={mockAccounts}
        onDisconnect={vi.fn()}
        onRefresh={handleRefresh}
        onReconnect={vi.fn()}
      />
    );

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(handleRefresh).toHaveBeenCalledWith("acc-1");
  });

  it("calls onReconnect with correct id for expired accounts", () => {
    const handleReconnect = vi.fn();
    render(
      <AccountsList
        accounts={mockAccounts}
        onDisconnect={vi.fn()}
        onRefresh={vi.fn()}
        onReconnect={handleReconnect}
      />
    );

    const reconnectButton = screen.getByRole("button", { name: /reconnect/i });
    fireEvent.click(reconnectButton);

    expect(handleReconnect).toHaveBeenCalledWith("acc-2");
  });

  it("displays account count", () => {
    render(
      <AccountsList
        accounts={mockAccounts}
        onDisconnect={vi.fn()}
        onRefresh={vi.fn()}
        onReconnect={vi.fn()}
      />
    );

    expect(screen.getByText("2 accounts")).toBeInTheDocument();
  });

  it("displays singular form for one account", () => {
    render(
      <AccountsList
        accounts={[mockAccounts[0]]}
        onDisconnect={vi.fn()}
        onRefresh={vi.fn()}
        onReconnect={vi.fn()}
      />
    );

    expect(screen.getByText("1 account")).toBeInTheDocument();
  });
});
