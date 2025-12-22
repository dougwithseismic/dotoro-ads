import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorTooltip } from "../ErrorTooltip";

describe("ErrorTooltip", () => {
  it("renders children", () => {
    render(
      <ErrorTooltip message="Error message">
        <button>Trigger</button>
      </ErrorTooltip>
    );

    expect(screen.getByRole("button", { name: "Trigger" })).toBeInTheDocument();
  });

  it("shows tooltip on mouse enter", () => {
    render(
      <ErrorTooltip message="This is an error">
        <button>Trigger</button>
      </ErrorTooltip>
    );

    const trigger = screen.getByRole("button", { name: "Trigger" }).parentElement!;
    fireEvent.mouseEnter(trigger);

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText("This is an error")).toBeInTheDocument();
  });

  it("hides tooltip on mouse leave", () => {
    render(
      <ErrorTooltip message="This is an error">
        <button>Trigger</button>
      </ErrorTooltip>
    );

    const trigger = screen.getByRole("button", { name: "Trigger" }).parentElement!;
    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows tooltip on focus for keyboard accessibility", () => {
    render(
      <ErrorTooltip message="Keyboard accessible error">
        <button>Trigger</button>
      </ErrorTooltip>
    );

    const trigger = screen.getByRole("button", { name: "Trigger" }).parentElement!;
    fireEvent.focus(trigger);

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText("Keyboard accessible error")).toBeInTheDocument();
  });

  it("hides tooltip on blur", () => {
    render(
      <ErrorTooltip message="Keyboard accessible error">
        <button>Trigger</button>
      </ErrorTooltip>
    );

    const trigger = screen.getByRole("button", { name: "Trigger" }).parentElement!;
    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.blur(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("displays the correct message content", () => {
    const errorMessage = "API rate limit exceeded. Please wait 5 minutes.";
    render(
      <ErrorTooltip message={errorMessage}>
        <span>Error icon</span>
      </ErrorTooltip>
    );

    const trigger = screen.getByText("Error icon").parentElement!;
    fireEvent.mouseEnter(trigger);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("has role tooltip attribute on the tooltip element", () => {
    render(
      <ErrorTooltip message="Test message">
        <button>Trigger</button>
      </ErrorTooltip>
    );

    const trigger = screen.getByRole("button", { name: "Trigger" }).parentElement!;
    fireEvent.mouseEnter(trigger);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveAttribute("role", "tooltip");
  });

  it("does not show tooltip initially", () => {
    render(
      <ErrorTooltip message="Hidden initially">
        <button>Trigger</button>
      </ErrorTooltip>
    );

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(screen.queryByText("Hidden initially")).not.toBeInTheDocument();
  });

  describe("position calculation", () => {
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    const originalOffsetHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetHeight"
    );

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      if (originalOffsetHeight) {
        Object.defineProperty(
          HTMLElement.prototype,
          "offsetHeight",
          originalOffsetHeight
        );
      }
      vi.useRealTimers();
    });

    it("positions tooltip at top when there is enough space above", () => {
      render(
        <ErrorTooltip message="Test tooltip">
          <button>Trigger</button>
        </ErrorTooltip>
      );

      // Mock getBoundingClientRect to simulate element positioned 200px from top
      Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 200,
        bottom: 220,
        left: 100,
        right: 200,
        width: 100,
        height: 20,
      });

      // Mock tooltip height
      Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
        configurable: true,
        value: 50,
      });

      const trigger = screen.getByRole("button", { name: "Trigger" }).parentElement!;
      fireEvent.mouseEnter(trigger);

      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveAttribute("data-position", "top");
    });

    it("positions tooltip at bottom when there is not enough space above", () => {
      render(
        <ErrorTooltip message="Test tooltip">
          <button>Trigger</button>
        </ErrorTooltip>
      );

      // Mock getBoundingClientRect to simulate element positioned very close to top (30px)
      Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 30,
        bottom: 50,
        left: 100,
        right: 200,
        width: 100,
        height: 20,
      });

      // Mock tooltip height (larger than available space above)
      Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
        configurable: true,
        value: 50,
      });

      const trigger = screen.getByRole("button", { name: "Trigger" }).parentElement!;
      fireEvent.mouseEnter(trigger);

      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveAttribute("data-position", "bottom");
    });
  });
});
