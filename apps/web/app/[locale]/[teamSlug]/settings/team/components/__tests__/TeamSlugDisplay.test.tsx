import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeamSlugDisplay } from "../TeamSlugDisplay";

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe("TeamSlugDisplay", () => {
  const defaultProps = {
    slug: "my-team",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the slug display component", () => {
      render(<TeamSlugDisplay {...defaultProps} />);

      expect(screen.getByTestId("team-slug-display")).toBeInTheDocument();
    });

    it("displays the team slug", () => {
      render(<TeamSlugDisplay {...defaultProps} slug="acme-corp" />);

      // The slug should be visible in the URL input
      expect(screen.getByDisplayValue(/acme-corp/)).toBeInTheDocument();
    });

    it("shows full URL format", () => {
      render(<TeamSlugDisplay {...defaultProps} slug="my-team" />);

      // The slug should be visible in the URL input value
      expect(screen.getByDisplayValue(/my-team/)).toBeInTheDocument();
      // The component should show the URL format
      expect(screen.getByTestId("team-url")).toBeInTheDocument();
    });

    it("displays copy button", () => {
      render(<TeamSlugDisplay {...defaultProps} />);

      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    });

    it("has disabled styling to indicate read-only", () => {
      render(<TeamSlugDisplay {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
    });
  });

  describe("copy functionality", () => {
    it("copies URL to clipboard when copy button is clicked", async () => {
      render(<TeamSlugDisplay {...defaultProps} slug="my-team" />);

      const copyButton = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalled();
      });
    });

    it("shows success feedback after copying", async () => {
      render(<TeamSlugDisplay {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });

    it("resets copy feedback after a delay", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      render(<TeamSlugDisplay {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /copy/i });
      await vi.waitFor(async () => {
        fireEvent.click(copyButton);
      });

      // Verify copied state appears
      await vi.waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });

      // Fast-forward timer past the 2s delay
      await vi.advanceTimersByTimeAsync(2100);

      // Verify copied state is gone
      await vi.waitFor(() => {
        expect(screen.queryByText(/copied/i)).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe("info tooltip", () => {
    it("displays info icon with tooltip explaining slug is set at creation", () => {
      render(<TeamSlugDisplay {...defaultProps} />);

      // Should have info icon
      const infoText = screen.getByText(/set when the team was created/i);
      expect(infoText).toBeInTheDocument();
    });
  });

  describe("custom base URL", () => {
    it("uses provided baseUrl", () => {
      render(
        <TeamSlugDisplay
          {...defaultProps}
          slug="my-team"
          baseUrl="custom.domain.com"
        />
      );

      // Check if the URL input value contains the custom domain
      expect(screen.getByTestId("team-url")).toHaveValue("https://custom.domain.com/my-team");
    });

    it("uses default baseUrl when not provided", () => {
      render(<TeamSlugDisplay {...defaultProps} slug="my-team" />);

      // Check the default URL format is present
      expect(screen.getByTestId("team-url")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has proper label for the input", () => {
      render(<TeamSlugDisplay {...defaultProps} />);

      expect(screen.getByLabelText(/team url/i)).toBeInTheDocument();
    });

    it("copy button has accessible name", () => {
      render(<TeamSlugDisplay {...defaultProps} />);

      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    });

    it("input is marked as readonly", () => {
      render(<TeamSlugDisplay {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("readonly");
    });
  });

  describe("styling", () => {
    it("applies disabled styling to indicate read-only", () => {
      render(<TeamSlugDisplay {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("opacity-50");
    });
  });
});
