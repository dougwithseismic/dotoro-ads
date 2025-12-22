import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlatformBadge } from "../PlatformBadge";

describe("PlatformBadge", () => {
  it("displays Reddit platform with correct text", () => {
    const { container } = render(<PlatformBadge platform="reddit" />);

    expect(screen.getByText("Reddit")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-platform", "reddit");
  });

  it("displays Google platform with correct text", () => {
    const { container } = render(<PlatformBadge platform="google" />);

    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-platform", "google");
  });

  it("displays Facebook platform with correct text", () => {
    const { container } = render(<PlatformBadge platform="facebook" />);

    expect(screen.getByText("Facebook")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-platform", "facebook");
  });

  it("shows only icon when compact mode is enabled", () => {
    render(<PlatformBadge platform="reddit" compact />);

    expect(screen.queryByText("Reddit")).not.toBeInTheDocument();
  });

  it("has title attribute with platform name", () => {
    const { container } = render(<PlatformBadge platform="google" />);

    expect(container.firstChild).toHaveAttribute("title", "Google");
  });

  it("renders SVG icon for each platform", () => {
    const platforms = ["reddit", "google", "facebook"] as const;

    platforms.forEach((platform) => {
      const { container, unmount } = render(<PlatformBadge platform={platform} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
      unmount();
    });
  });
});
