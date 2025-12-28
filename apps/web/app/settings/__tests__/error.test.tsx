import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsError from "../error";

describe("SettingsError", () => {
  const mockError = new Error("Test error message") as Error & { digest?: string };
  const mockReset = vi.fn();

  beforeEach(() => {
    mockReset.mockClear();
    // Suppress console.error in tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should render error boundary component", () => {
      render(<SettingsError error={mockError} reset={mockReset} />);

      expect(screen.getByTestId("settings-error")).toBeInTheDocument();
    });

    it("should display error heading", () => {
      render(<SettingsError error={mockError} reset={mockReset} />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("should display user-friendly error message", () => {
      render(<SettingsError error={mockError} reset={mockReset} />);

      expect(
        screen.getByText(/we encountered an error loading your settings/i)
      ).toBeInTheDocument();
    });

    it("should display a retry button", () => {
      render(<SettingsError error={mockError} reset={mockReset} />);

      const retryButton = screen.getByRole("button", { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe("Retry functionality", () => {
    it("should call reset when retry button is clicked", () => {
      render(<SettingsError error={mockError} reset={mockReset} />);

      const retryButton = screen.getByRole("button", { name: /try again/i });
      fireEvent.click(retryButton);

      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error logging", () => {
    it("should log error to console", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<SettingsError error={mockError} reset={mockReset} />);

      expect(consoleErrorSpy).toHaveBeenCalledWith("Settings error:", mockError);
    });
  });

  describe("Error digest display", () => {
    it("should not show error digest in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const errorWithDigest = { ...mockError, digest: "abc123" } as Error & {
        digest?: string;
      };

      render(<SettingsError error={errorWithDigest} reset={mockReset} />);

      expect(screen.queryByText(/error id/i)).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Accessibility", () => {
    it("should have proper button styling for focus states", () => {
      render(<SettingsError error={mockError} reset={mockReset} />);

      const retryButton = screen.getByRole("button", { name: /try again/i });
      expect(retryButton).toHaveClass("focus:outline-none");
      expect(retryButton).toHaveClass("focus:ring-2");
    });

    it("should have aria-hidden on decorative icon", () => {
      render(<SettingsError error={mockError} reset={mockReset} />);

      const icon = screen.getByTestId("settings-error").querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });
});
