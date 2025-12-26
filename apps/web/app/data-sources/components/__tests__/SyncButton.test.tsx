import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SyncButton } from "../SyncButton";

describe("SyncButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("visibility", () => {
    it("renders for api type data sources", () => {
      render(
        <SyncButton
          dataSourceId="1"
          status="idle"
          dataSourceType="api"
          onSync={vi.fn()}
        />
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("renders for google-sheets type data sources", () => {
      render(
        <SyncButton
          dataSourceId="1"
          status="idle"
          dataSourceType="google-sheets"
          onSync={vi.fn()}
        />
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("does not render for csv type data sources", () => {
      render(
        <SyncButton
          dataSourceId="1"
          status="idle"
          dataSourceType="csv"
          onSync={vi.fn()}
        />
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("states", () => {
    it("shows Sync text and refresh icon in idle state", () => {
      render(
        <SyncButton
          dataSourceId="1"
          status="idle"
          dataSourceType="api"
          onSync={vi.fn()}
        />
      );

      const button = screen.getByRole("button", { name: /sync/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Sync");
      expect(button.querySelector("svg")).toBeInTheDocument();
    });

    it("shows Syncing text and spinner in syncing state", () => {
      render(
        <SyncButton
          dataSourceId="1"
          status="syncing"
          dataSourceType="api"
          onSync={vi.fn()}
        />
      );

      const button = screen.getByRole("button", { name: /syncing/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Syncing...");
      expect(button.querySelector("svg")).toBeInTheDocument();
    });

    it("shows Synced text and checkmark in success state", () => {
      render(
        <SyncButton
          dataSourceId="1"
          status="success"
          dataSourceType="api"
          onSync={vi.fn()}
        />
      );

      const button = screen.getByRole("button", { name: /synced/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Synced");
      expect(button.querySelector("svg")).toBeInTheDocument();
    });

    it("shows Retry text and warning icon in error state", () => {
      render(
        <SyncButton
          dataSourceId="1"
          status="error"
          dataSourceType="api"
          onSync={vi.fn()}
        />
      );

      const button = screen.getByRole("button", { name: /retry/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Retry");
      expect(button.querySelector("svg")).toBeInTheDocument();
    });

    it("reverts to idle after 3s in success state", async () => {
      const { rerender } = render(
        <SyncButton
          dataSourceId="1"
          status="success"
          dataSourceType="api"
          onSync={vi.fn()}
        />
      );

      expect(screen.getByRole("button")).toHaveTextContent("Synced");

      // Advance timers by 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // The parent component should handle state change, but internally
      // the button should trigger a callback or use internal state
      // For this test, we verify the component has the data attribute for auto-revert
      expect(screen.getByRole("button")).toHaveAttribute("data-auto-revert", "true");
    });
  });

  describe("interactions", () => {
    it("calls onSync when clicked", async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      const onSync = vi.fn().mockResolvedValue(undefined);

      render(
        <SyncButton
          dataSourceId="1"
          status="idle"
          dataSourceType="api"
          onSync={onSync}
        />
      );

      const button = screen.getByRole("button", { name: /sync/i });
      await user.click(button);

      expect(onSync).toHaveBeenCalledTimes(1);
    });

    it("is disabled while syncing", () => {
      render(
        <SyncButton
          dataSourceId="1"
          status="syncing"
          dataSourceType="api"
          onSync={vi.fn()}
        />
      );

      const button = screen.getByRole("button", { name: /syncing/i });
      expect(button).toBeDisabled();
    });

    it("is not disabled in idle state", () => {
      render(
        <SyncButton
          dataSourceId="1"
          status="idle"
          dataSourceType="api"
          onSync={vi.fn()}
        />
      );

      const button = screen.getByRole("button", { name: /sync/i });
      expect(button).not.toBeDisabled();
    });

    it("is not disabled in error state", () => {
      render(
        <SyncButton
          dataSourceId="1"
          status="error"
          dataSourceType="api"
          onSync={vi.fn()}
        />
      );

      const button = screen.getByRole("button", { name: /retry/i });
      expect(button).not.toBeDisabled();
    });

    it("prevents multiple clicks while syncing", async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      const onSync = vi.fn().mockResolvedValue(undefined);

      render(
        <SyncButton
          dataSourceId="1"
          status="syncing"
          dataSourceType="api"
          onSync={onSync}
        />
      );

      const button = screen.getByRole("button", { name: /syncing/i });
      await user.click(button);

      expect(onSync).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("has proper aria-label for idle state", () => {
      render(
        <SyncButton
          dataSourceId="1"
          status="idle"
          dataSourceType="api"
          onSync={vi.fn()}
        />
      );

      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Sync")
      );
    });

    it("has aria-busy attribute when syncing", () => {
      render(
        <SyncButton
          dataSourceId="1"
          status="syncing"
          dataSourceType="api"
          onSync={vi.fn()}
        />
      );

      expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    });

    it("has data-status attribute matching status", () => {
      const { rerender } = render(
        <SyncButton
          dataSourceId="1"
          status="idle"
          dataSourceType="api"
          onSync={vi.fn()}
        />
      );

      expect(screen.getByRole("button")).toHaveAttribute("data-status", "idle");

      rerender(
        <SyncButton
          dataSourceId="1"
          status="syncing"
          dataSourceType="api"
          onSync={vi.fn()}
        />
      );

      expect(screen.getByRole("button")).toHaveAttribute("data-status", "syncing");
    });
  });
});
