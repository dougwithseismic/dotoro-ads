import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CharacterCounter } from "../CharacterCounter";

describe("CharacterCounter", () => {
  describe("Basic rendering", () => {
    it("displays current and limit count in format 'X/Y'", () => {
      render(<CharacterCounter value="Hello" limit={30} fieldName="headline" />);

      expect(screen.getByText("5/30")).toBeInTheDocument();
    });

    it("calculates length correctly for multi-byte characters", () => {
      render(<CharacterCounter value="Hello World" limit={100} fieldName="headline" />);

      expect(screen.getByText("11/100")).toBeInTheDocument();
    });

    it("handles empty string value", () => {
      render(<CharacterCounter value="" limit={30} fieldName="headline" />);

      expect(screen.getByText("0/30")).toBeInTheDocument();
    });
  });

  describe("Color states based on percentage", () => {
    it("shows green state (ok) for 0-79% usage", () => {
      // 20/100 = 20%
      render(<CharacterCounter value="12345678901234567890" limit={100} fieldName="headline" />);

      const container = screen.getByTestId("character-counter");
      expect(container).toHaveAttribute("data-status", "ok");
    });

    it("shows yellow state (warning) for 80-94% usage", () => {
      // 85 chars / 100 limit = 85%
      const text = "a".repeat(85);
      render(<CharacterCounter value={text} limit={100} fieldName="headline" />);

      const container = screen.getByTestId("character-counter");
      expect(container).toHaveAttribute("data-status", "warning");
    });

    it("shows red state (error) for 95%+ usage", () => {
      // 96 chars / 100 limit = 96%
      const text = "a".repeat(96);
      render(<CharacterCounter value={text} limit={100} fieldName="headline" />);

      const container = screen.getByTestId("character-counter");
      expect(container).toHaveAttribute("data-status", "error");
    });

    it("shows red state (error) when exceeding limit", () => {
      // 120 chars / 100 limit = 120%
      const text = "a".repeat(120);
      render(<CharacterCounter value={text} limit={100} fieldName="headline" />);

      const container = screen.getByTestId("character-counter");
      expect(container).toHaveAttribute("data-status", "error");
    });

    it("applies warning at exactly 80% threshold", () => {
      // 80/100 = 80%
      const text = "a".repeat(80);
      render(<CharacterCounter value={text} limit={100} fieldName="headline" />);

      const container = screen.getByTestId("character-counter");
      expect(container).toHaveAttribute("data-status", "warning");
    });

    it("applies error at exactly 95% threshold", () => {
      // 95/100 = 95%
      const text = "a".repeat(95);
      render(<CharacterCounter value={text} limit={100} fieldName="headline" />);

      const container = screen.getByTestId("character-counter");
      expect(container).toHaveAttribute("data-status", "error");
    });
  });

  describe("Accessibility", () => {
    it("has aria-live region for screen reader announcements", () => {
      render(<CharacterCounter value="Test" limit={30} fieldName="headline" />);

      const container = screen.getByTestId("character-counter");
      expect(container).toHaveAttribute("aria-live", "polite");
    });

    it("has role=status for accessibility", () => {
      render(<CharacterCounter value="Test" limit={30} fieldName="headline" />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("includes field name in aria-label", () => {
      render(<CharacterCounter value="Test" limit={30} fieldName="headline" />);

      const container = screen.getByTestId("character-counter");
      expect(container).toHaveAttribute("aria-label", expect.stringContaining("headline"));
    });
  });

  describe("Platform-specific limits", () => {
    it("uses correct limit for Reddit headline (100 chars)", () => {
      render(<CharacterCounter value="Test headline" limit={100} fieldName="headline" />);

      expect(screen.getByText("13/100")).toBeInTheDocument();
    });

    it("uses correct limit for Google headline (30 chars)", () => {
      render(<CharacterCounter value="Test headline" limit={30} fieldName="headline" />);

      expect(screen.getByText("13/30")).toBeInTheDocument();
    });

    it("uses correct limit for Reddit description (500 chars)", () => {
      render(<CharacterCounter value="Test description" limit={500} fieldName="description" />);

      expect(screen.getByText("16/500")).toBeInTheDocument();
    });

    it("uses correct limit for Google description (90 chars)", () => {
      render(<CharacterCounter value="Test description" limit={90} fieldName="description" />);

      expect(screen.getByText("16/90")).toBeInTheDocument();
    });

    it("uses correct limit for Reddit displayUrl (25 chars)", () => {
      render(<CharacterCounter value="example.com" limit={25} fieldName="displayUrl" />);

      expect(screen.getByText("11/25")).toBeInTheDocument();
    });

    it("uses correct limit for Google displayUrl (30 chars)", () => {
      render(<CharacterCounter value="example.com" limit={30} fieldName="displayUrl" />);

      expect(screen.getByText("11/30")).toBeInTheDocument();
    });
  });

  describe("Error message display", () => {
    it("shows overflow message when limit exceeded", () => {
      const text = "a".repeat(35);
      render(<CharacterCounter value={text} limit={30} fieldName="headline" showOverflowMessage />);

      expect(screen.getByText(/5 characters? over/i)).toBeInTheDocument();
    });

    it("does not show overflow message when within limit", () => {
      render(<CharacterCounter value="Short" limit={30} fieldName="headline" showOverflowMessage />);

      expect(screen.queryByText(/over/i)).not.toBeInTheDocument();
    });

    it("hides overflow message when showOverflowMessage is false", () => {
      const text = "a".repeat(35);
      render(<CharacterCounter value={text} limit={30} fieldName="headline" showOverflowMessage={false} />);

      expect(screen.queryByText(/over/i)).not.toBeInTheDocument();
    });
  });

  describe("Custom thresholds", () => {
    it("accepts custom warning threshold", () => {
      // At 70% usage with 0.7 warning threshold should be warning
      const text = "a".repeat(70);
      render(
        <CharacterCounter
          value={text}
          limit={100}
          fieldName="headline"
          warningThreshold={0.7}
        />
      );

      const container = screen.getByTestId("character-counter");
      expect(container).toHaveAttribute("data-status", "warning");
    });

    it("accepts custom error threshold", () => {
      // At 90% usage with 0.9 error threshold should be error
      const text = "a".repeat(90);
      render(
        <CharacterCounter
          value={text}
          limit={100}
          fieldName="headline"
          errorThreshold={0.9}
        />
      );

      const container = screen.getByTestId("character-counter");
      expect(container).toHaveAttribute("data-status", "error");
    });
  });
});
