import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ConnectButton } from "../ConnectButton";
import type { PlatformConfig } from "../../types";

const availablePlatform: PlatformConfig = {
  platform: "reddit",
  name: "Reddit Ads",
  icon: "reddit",
  available: true,
  oauthUrl: "/api/auth/reddit",
};

const unavailablePlatform: PlatformConfig = {
  platform: "google",
  name: "Google Ads",
  icon: "google",
  available: false,
};

describe("ConnectButton", () => {
  it("renders platform name for available platform", () => {
    render(<ConnectButton config={availablePlatform} />);

    expect(screen.getByText("Connect Reddit Ads")).toBeInTheDocument();
  });

  it("shows coming soon badge for unavailable platform", () => {
    render(<ConnectButton config={unavailablePlatform} />);

    expect(screen.getByText("Google Ads")).toBeInTheDocument();
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
  });

  it("button is disabled for unavailable platform", () => {
    render(<ConnectButton config={unavailablePlatform} />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("button is enabled for available platform", () => {
    render(<ConnectButton config={availablePlatform} />);

    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();
  });

  it("calls onClick when clicked for available platform", () => {
    const handleClick = vi.fn();
    render(<ConnectButton config={availablePlatform} onClick={handleClick} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when clicked for unavailable platform", () => {
    const handleClick = vi.fn();
    render(<ConnectButton config={unavailablePlatform} onClick={handleClick} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders platform icon", () => {
    const { container } = render(<ConnectButton config={availablePlatform} />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("applies correct data attribute for platform", () => {
    const { container } = render(<ConnectButton config={availablePlatform} />);

    expect(container.firstChild).toHaveAttribute("data-platform", "reddit");
  });

  it("shows loading state when isLoading is true", () => {
    render(<ConnectButton config={availablePlatform} isLoading={true} />);

    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it("disables button when loading", () => {
    render(<ConnectButton config={availablePlatform} isLoading={true} />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("shows spinner when loading", () => {
    const { container } = render(
      <ConnectButton config={availablePlatform} isLoading={true} />
    );

    expect(container.querySelector('[data-loading="true"]')).toBeInTheDocument();
  });
});
