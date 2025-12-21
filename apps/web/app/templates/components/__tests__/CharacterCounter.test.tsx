import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CharacterCounter } from "../CharacterCounter";

describe("CharacterCounter", () => {
  it("displays current and max character count", () => {
    render(<CharacterCounter current={50} max={100} />);

    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("displays optional label when provided", () => {
    render(<CharacterCounter current={25} max={100} label="Characters" />);

    expect(screen.getByText("Characters")).toBeInTheDocument();
  });

  it("applies ok status when below warning threshold", () => {
    const { container } = render(<CharacterCounter current={50} max={100} />);

    const counter = container.firstChild;
    expect(counter).toHaveAttribute("data-status", "ok");
  });

  it("applies warning status when at or above warning threshold but below limit", () => {
    const { container } = render(<CharacterCounter current={85} max={100} />);

    const counter = container.firstChild;
    expect(counter).toHaveAttribute("data-status", "warning");
  });

  it("applies error status when at limit", () => {
    const { container } = render(<CharacterCounter current={100} max={100} />);

    const counter = container.firstChild;
    expect(counter).toHaveAttribute("data-status", "error");
  });

  it("applies error status when over limit", () => {
    const { container } = render(<CharacterCounter current={120} max={100} />);

    const counter = container.firstChild;
    expect(counter).toHaveAttribute("data-status", "error");
  });

  it("uses custom warning threshold when provided", () => {
    // With 0.9 threshold, 85% should be ok, 92% should be warning
    const { container, rerender } = render(
      <CharacterCounter current={85} max={100} warningThreshold={0.9} />
    );

    expect(container.firstChild).toHaveAttribute("data-status", "ok");

    rerender(
      <CharacterCounter current={92} max={100} warningThreshold={0.9} />
    );

    expect(container.firstChild).toHaveAttribute("data-status", "warning");
  });

  it("handles zero character count", () => {
    const { container } = render(<CharacterCounter current={0} max={100} />);

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-status", "ok");
  });

  it("handles edge case where current equals threshold boundary", () => {
    // 80/100 = 80% which equals default threshold of 0.8
    const { container } = render(<CharacterCounter current={80} max={100} />);

    expect(container.firstChild).toHaveAttribute("data-status", "warning");
  });
});
