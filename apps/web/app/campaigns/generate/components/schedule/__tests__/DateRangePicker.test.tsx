import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DateRangePicker } from "../DateRangePicker";
import type { ScheduleConfig } from "../../../types";

describe("DateRangePicker", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  describe("Rendering", () => {
    it("renders start date and end date inputs", () => {
      // Provide an end date so end date input is visible (not in continuous mode)
      render(<DateRangePicker value={{ endDate: "2024-02-15" }} onChange={onChange} />);

      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });

    it("renders timezone selector", () => {
      render(<DateRangePicker value={{}} onChange={onChange} />);

      expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
    });

    it("renders continuous run toggle", () => {
      render(<DateRangePicker value={{}} onChange={onChange} />);

      expect(screen.getByText(/run continuously/i)).toBeInTheDocument();
    });

    it("displays current values", () => {
      const scheduleConfig: ScheduleConfig = {
        startDate: "2024-01-15",
        endDate: "2024-02-15",
        timezone: "America/New_York",
      };

      render(<DateRangePicker value={scheduleConfig} onChange={onChange} />);

      expect(screen.getByDisplayValue("2024-01-15")).toBeInTheDocument();
      expect(screen.getByDisplayValue("2024-02-15")).toBeInTheDocument();
    });
  });

  describe("Continuous Run Mode", () => {
    it("hides end date when continuous run is enabled", async () => {
      const user = userEvent.setup();

      // Start with an end date so continuous mode is OFF
      render(<DateRangePicker value={{ endDate: "2024-02-15" }} onChange={onChange} />);

      // Click to enable continuous mode
      await user.click(screen.getByRole("checkbox", { name: /run continuously/i }));

      expect(screen.queryByLabelText(/end date/i)).not.toBeInTheDocument();
    });

    it("shows end date when continuous run is disabled", () => {
      render(<DateRangePicker value={{ endDate: "2024-02-15" }} onChange={onChange} />);

      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });

    it("clears end date when continuous run is enabled", async () => {
      const user = userEvent.setup();

      render(
        <DateRangePicker
          value={{ startDate: "2024-01-15", endDate: "2024-02-15" }}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole("checkbox", { name: /run continuously/i }));

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          endDate: undefined,
        })
      );
    });
  });

  describe("Date Changes", () => {
    it("calls onChange when start date is changed", async () => {
      const user = userEvent.setup();

      render(<DateRangePicker value={{}} onChange={onChange} />);

      const startDateInput = screen.getByLabelText(/start date/i);
      await user.clear(startDateInput);
      await user.type(startDateInput, "2024-03-01");

      expect(onChange).toHaveBeenCalled();
    });

    it("calls onChange when end date is changed", async () => {
      const user = userEvent.setup();

      // Provide an end date to ensure end date input is visible
      render(<DateRangePicker value={{ endDate: "2024-02-15" }} onChange={onChange} />);

      const endDateInput = screen.getByLabelText(/end date/i);
      await user.clear(endDateInput);
      await user.type(endDateInput, "2024-04-01");

      expect(onChange).toHaveBeenCalled();
    });

    it("calls onChange when timezone is changed", async () => {
      const user = userEvent.setup();

      render(<DateRangePicker value={{}} onChange={onChange} />);

      await user.selectOptions(screen.getByLabelText(/timezone/i), "Europe/London");

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          timezone: "Europe/London",
        })
      );
    });
  });

  describe("Validation", () => {
    it("shows error when end date is before start date", () => {
      render(
        <DateRangePicker
          value={{
            startDate: "2024-03-15",
            endDate: "2024-03-01",
          }}
          onChange={onChange}
        />
      );

      expect(screen.getByText(/end date must be after/i)).toBeInTheDocument();
    });

    it("does not show error when dates are valid", () => {
      render(
        <DateRangePicker
          value={{
            startDate: "2024-03-01",
            endDate: "2024-03-15",
          }}
          onChange={onChange}
        />
      );

      expect(screen.queryByText(/end date must be after/i)).not.toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("disables all inputs when disabled prop is true", () => {
      // Provide an end date to ensure end date input is visible
      render(<DateRangePicker value={{ endDate: "2024-02-15" }} onChange={onChange} disabled />);

      expect(screen.getByLabelText(/start date/i)).toBeDisabled();
      expect(screen.getByLabelText(/end date/i)).toBeDisabled();
      expect(screen.getByLabelText(/timezone/i)).toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("has accessible labels for all inputs", () => {
      // Provide an end date to ensure continuous is not enabled
      render(<DateRangePicker value={{ endDate: "2024-02-15" }} onChange={onChange} />);

      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
    });
  });
});
