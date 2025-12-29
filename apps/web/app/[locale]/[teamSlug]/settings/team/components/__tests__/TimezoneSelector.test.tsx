import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TimezoneSelector } from "../TimezoneSelector";

describe("TimezoneSelector", () => {
  const defaultProps = {
    currentTimezone: "America/New_York",
    onTimezoneChange: vi.fn().mockResolvedValue(undefined),
    canEdit: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the timezone selector component", () => {
      render(<TimezoneSelector {...defaultProps} />);

      expect(screen.getByTestId("timezone-selector")).toBeInTheDocument();
    });

    it("displays the current timezone", () => {
      render(<TimezoneSelector {...defaultProps} currentTimezone="Europe/London" />);

      expect(screen.getByRole("combobox")).toHaveTextContent(/europe\/london/i);
    });

    it("displays label text", () => {
      render(<TimezoneSelector {...defaultProps} />);

      expect(screen.getByText(/team timezone/i)).toBeInTheDocument();
    });

    it("shows current time in selected timezone", () => {
      render(<TimezoneSelector {...defaultProps} />);

      // Should display some time indicator
      expect(screen.getByTestId("current-time")).toBeInTheDocument();
    });
  });

  describe("search functionality", () => {
    it("has a search input for filtering timezones", () => {
      render(<TimezoneSelector {...defaultProps} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      expect(screen.getByPlaceholderText(/search timezone/i)).toBeInTheDocument();
    });

    it("filters timezones based on search input", async () => {
      render(<TimezoneSelector {...defaultProps} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      const searchInput = screen.getByPlaceholderText(/search timezone/i);
      fireEvent.change(searchInput, { target: { value: "tokyo" } });

      await waitFor(() => {
        expect(screen.getByText(/asia\/tokyo/i)).toBeInTheDocument();
      });
    });

    it("shows no results message when search has no matches", async () => {
      render(<TimezoneSelector {...defaultProps} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      const searchInput = screen.getByPlaceholderText(/search timezone/i);
      fireEvent.change(searchInput, { target: { value: "xyznonexistent" } });

      await waitFor(() => {
        expect(screen.getByText(/no timezones found/i)).toBeInTheDocument();
      });
    });
  });

  describe("timezone selection", () => {
    it("calls onTimezoneChange when a timezone is selected", async () => {
      render(<TimezoneSelector {...defaultProps} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      // Search for a timezone
      const searchInput = screen.getByPlaceholderText(/search timezone/i);
      fireEvent.change(searchInput, { target: { value: "tokyo" } });

      await waitFor(() => {
        const tokyoOption = screen.getByText(/asia\/tokyo/i);
        fireEvent.click(tokyoOption);
      });

      await waitFor(() => {
        expect(defaultProps.onTimezoneChange).toHaveBeenCalledWith("Asia/Tokyo");
      });
    });

    it("closes dropdown after selection", async () => {
      render(<TimezoneSelector {...defaultProps} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      const searchInput = screen.getByPlaceholderText(/search timezone/i);
      fireEvent.change(searchInput, { target: { value: "london" } });

      await waitFor(() => {
        const londonOption = screen.getByText(/europe\/london/i);
        fireEvent.click(londonOption);
      });

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/search timezone/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("permission control", () => {
    it("disables selector when canEdit is false", () => {
      render(<TimezoneSelector {...defaultProps} canEdit={false} />);

      const combobox = screen.getByRole("combobox");
      expect(combobox).toBeDisabled();
    });

    it("enables selector when canEdit is true", () => {
      render(<TimezoneSelector {...defaultProps} canEdit={true} />);

      const combobox = screen.getByRole("combobox");
      expect(combobox).not.toBeDisabled();
    });
  });

  describe("loading state", () => {
    it("shows loading indicator while saving", async () => {
      const slowSave = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<TimezoneSelector {...defaultProps} onTimezoneChange={slowSave} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      const searchInput = screen.getByPlaceholderText(/search timezone/i);
      fireEvent.change(searchInput, { target: { value: "tokyo" } });

      await waitFor(() => {
        const tokyoOption = screen.getByText(/asia\/tokyo/i);
        fireEvent.click(tokyoOption);
      });

      expect(await screen.findByTestId("timezone-saving")).toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("shows error message when save fails", async () => {
      const failingSave = vi.fn().mockRejectedValue(new Error("Save failed"));
      render(<TimezoneSelector {...defaultProps} onTimezoneChange={failingSave} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      const searchInput = screen.getByPlaceholderText(/search timezone/i);
      fireEvent.change(searchInput, { target: { value: "tokyo" } });

      await waitFor(() => {
        const tokyoOption = screen.getByText(/asia\/tokyo/i);
        fireEvent.click(tokyoOption);
      });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/save failed/i);
      });
    });
  });

  describe("default timezone", () => {
    it("shows browser timezone hint when no timezone is set", () => {
      render(<TimezoneSelector {...defaultProps} currentTimezone="" />);

      expect(screen.getByText(/browser default/i)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has proper label association", () => {
      render(<TimezoneSelector {...defaultProps} />);

      expect(screen.getByLabelText(/team timezone/i)).toBeInTheDocument();
    });

    it("search input is accessible", () => {
      render(<TimezoneSelector {...defaultProps} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      expect(screen.getByRole("searchbox")).toBeInTheDocument();
    });
  });
});
