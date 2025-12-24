import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PacingSelector } from "../PacingSelector";

describe("PacingSelector", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  describe("Rendering", () => {
    it("renders standard and accelerated options", () => {
      render(<PacingSelector value="standard" onChange={onChange} />);

      expect(screen.getByTestId("pacing-standard")).toBeInTheDocument();
      expect(screen.getByTestId("pacing-accelerated")).toBeInTheDocument();
    });

    it("displays pacing option descriptions", () => {
      render(<PacingSelector value="standard" onChange={onChange} />);

      expect(screen.getByText(/evenly/i)).toBeInTheDocument();
      expect(screen.getByText(/quickly|fast/i)).toBeInTheDocument();
    });

    it("renders with label when provided", () => {
      render(<PacingSelector value="standard" onChange={onChange} label="Pacing Strategy" />);
      expect(screen.getByText("Pacing Strategy")).toBeInTheDocument();
    });

    it("shows recommended badge on standard option", () => {
      render(<PacingSelector value="standard" onChange={onChange} />);
      expect(screen.getByText(/recommended/i)).toBeInTheDocument();
    });
  });

  describe("Selection State", () => {
    it("marks standard as selected when value is standard", () => {
      render(<PacingSelector value="standard" onChange={onChange} />);

      const standardOption = screen.getByTestId("pacing-standard");
      expect(standardOption).toHaveAttribute("aria-checked", "true");

      const acceleratedOption = screen.getByTestId("pacing-accelerated");
      expect(acceleratedOption).toHaveAttribute("aria-checked", "false");
    });

    it("marks accelerated as selected when value is accelerated", () => {
      render(<PacingSelector value="accelerated" onChange={onChange} />);

      const standardOption = screen.getByTestId("pacing-standard");
      expect(standardOption).toHaveAttribute("aria-checked", "false");

      const acceleratedOption = screen.getByTestId("pacing-accelerated");
      expect(acceleratedOption).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("Interactions", () => {
    it("calls onChange with standard when standard is clicked", async () => {
      const user = userEvent.setup();

      render(<PacingSelector value="accelerated" onChange={onChange} />);

      await user.click(screen.getByTestId("pacing-standard"));

      expect(onChange).toHaveBeenCalledWith("standard");
    });

    it("calls onChange with accelerated when accelerated is clicked", async () => {
      const user = userEvent.setup();

      render(<PacingSelector value="standard" onChange={onChange} />);

      await user.click(screen.getByTestId("pacing-accelerated"));

      expect(onChange).toHaveBeenCalledWith("accelerated");
    });

    it("does not call onChange when clicking already selected option", async () => {
      const user = userEvent.setup();

      render(<PacingSelector value="standard" onChange={onChange} />);

      await user.click(screen.getByTestId("pacing-standard"));

      expect(onChange).not.toHaveBeenCalled();
    });

    it("supports keyboard selection", async () => {
      const user = userEvent.setup();

      render(<PacingSelector value="standard" onChange={onChange} />);

      const acceleratedOption = screen.getByTestId("pacing-accelerated");
      acceleratedOption.focus();

      await user.keyboard("{Enter}");

      expect(onChange).toHaveBeenCalledWith("accelerated");
    });
  });

  describe("Warning Display", () => {
    it("shows warning when accelerated is selected", () => {
      render(<PacingSelector value="accelerated" onChange={onChange} showWarning />);

      expect(screen.getByText(/exhaust your budget early/i)).toBeInTheDocument();
    });

    it("does not show warning when standard is selected", () => {
      render(<PacingSelector value="standard" onChange={onChange} showWarning />);

      expect(screen.queryByText(/exhaust your budget early/i)).not.toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("disables options when disabled prop is true", () => {
      render(<PacingSelector value="standard" onChange={onChange} disabled />);

      expect(screen.getByTestId("pacing-standard")).toBeDisabled();
      expect(screen.getByTestId("pacing-accelerated")).toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("has proper radiogroup role", () => {
      render(<PacingSelector value="standard" onChange={onChange} />);

      expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    });

    it("has accessible labels for each option", () => {
      render(<PacingSelector value="standard" onChange={onChange} />);

      expect(screen.getByRole("radio", { name: /standard/i })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /accelerated/i })).toBeInTheDocument();
    });
  });
});
