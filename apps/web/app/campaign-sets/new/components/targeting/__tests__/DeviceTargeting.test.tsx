import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeviceTargeting } from "../DeviceTargeting";
import type { DeviceTarget } from "@repo/core";

describe("DeviceTargeting", () => {
  const defaultProps = {
    devices: undefined as DeviceTarget | undefined,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all device targeting fields", () => {
    render(<DeviceTargeting {...defaultProps} />);

    expect(screen.getByText("Device Types")).toBeInTheDocument();
    expect(screen.getByText("Operating Systems")).toBeInTheDocument();
    expect(screen.getByText("Browsers")).toBeInTheDocument();
  });

  it("renders device type buttons", () => {
    render(<DeviceTargeting {...defaultProps} />);

    expect(screen.getByTestId("device-desktop")).toBeInTheDocument();
    expect(screen.getByTestId("device-mobile")).toBeInTheDocument();
    expect(screen.getByTestId("device-tablet")).toBeInTheDocument();
  });

  it("toggles device type when clicked", () => {
    const onChange = vi.fn();
    render(<DeviceTargeting devices={undefined} onChange={onChange} />);

    const desktopButton = screen.getByTestId("device-desktop");
    fireEvent.click(desktopButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        types: ["desktop"],
      })
    );
  });

  it("displays selected device types", () => {
    const devices: DeviceTarget = {
      types: ["desktop", "mobile"],
    };

    render(<DeviceTargeting devices={devices} onChange={vi.fn()} />);

    // Check that both buttons have active styling
    const desktopButton = screen.getByTestId("device-desktop");
    const mobileButton = screen.getByTestId("device-mobile");
    const tabletButton = screen.getByTestId("device-tablet");

    // Desktop and mobile should be active, tablet should not
    expect(desktopButton.className).toMatch(/deviceActive/);
    expect(mobileButton.className).toMatch(/deviceActive/);
    expect(tabletButton.className).not.toMatch(/deviceActive/);
  });

  it("deselects device type when clicked again", () => {
    const onChange = vi.fn();
    const devices: DeviceTarget = {
      types: ["desktop", "mobile"],
    };

    render(<DeviceTargeting devices={devices} onChange={onChange} />);

    const desktopButton = screen.getByTestId("device-desktop");
    fireEvent.click(desktopButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        types: ["mobile"],
      })
    );
  });

  it("renders operating system options", () => {
    render(<DeviceTargeting {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Windows" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "macOS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "iOS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Android" })).toBeInTheDocument();
  });

  it("toggles operating system when clicked", () => {
    const onChange = vi.fn();
    render(<DeviceTargeting devices={undefined} onChange={onChange} />);

    const windowsButton = screen.getByRole("button", { name: "Windows" });
    fireEvent.click(windowsButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        operatingSystems: ["windows"],
      })
    );
  });

  it("displays selected operating systems", () => {
    const devices: DeviceTarget = {
      operatingSystems: ["windows", "macos"],
    };

    render(<DeviceTargeting devices={devices} onChange={vi.fn()} />);

    const windowsButton = screen.getByRole("button", { name: "Windows" });
    const macosButton = screen.getByRole("button", { name: "macOS" });

    expect(windowsButton.className).toMatch(/optionActive/);
    expect(macosButton.className).toMatch(/optionActive/);
  });

  it("renders browser options", () => {
    render(<DeviceTargeting {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Chrome" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Safari" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Firefox" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edge" })).toBeInTheDocument();
  });

  it("toggles browser when clicked", () => {
    const onChange = vi.fn();
    render(<DeviceTargeting devices={undefined} onChange={onChange} />);

    const chromeButton = screen.getByRole("button", { name: "Chrome" });
    fireEvent.click(chromeButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        browsers: ["chrome"],
      })
    );
  });

  it("displays selected browsers", () => {
    const devices: DeviceTarget = {
      browsers: ["chrome", "safari"],
    };

    render(<DeviceTargeting devices={devices} onChange={vi.fn()} />);

    const chromeButton = screen.getByRole("button", { name: "Chrome" });
    const safariButton = screen.getByRole("button", { name: "Safari" });

    expect(chromeButton.className).toMatch(/optionActive/);
    expect(safariButton.className).toMatch(/optionActive/);
  });

  it("shows help text", () => {
    render(<DeviceTargeting {...defaultProps} />);

    expect(
      screen.getByText(/leave all options unselected/i)
    ).toBeInTheDocument();
  });

  it("clears devices when all fields are empty", () => {
    const onChange = vi.fn();
    const devices: DeviceTarget = {
      types: ["desktop"],
    };

    render(<DeviceTargeting devices={devices} onChange={onChange} />);

    // Deselect the only device type
    const desktopButton = screen.getByTestId("device-desktop");
    fireEvent.click(desktopButton);

    // Should call with undefined when empty
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("handles multiple selections across all categories", () => {
    const devices: DeviceTarget = {
      types: ["desktop", "mobile"],
      operatingSystems: ["windows", "ios"],
      browsers: ["chrome", "safari"],
    };

    render(<DeviceTargeting devices={devices} onChange={vi.fn()} />);

    // Verify all selections are displayed
    expect(screen.getByTestId("device-desktop").className).toMatch(/deviceActive/);
    expect(screen.getByTestId("device-mobile").className).toMatch(/deviceActive/);
    expect(screen.getByRole("button", { name: "Windows" }).className).toMatch(/optionActive/);
    expect(screen.getByRole("button", { name: "iOS" }).className).toMatch(/optionActive/);
    expect(screen.getByRole("button", { name: "Chrome" }).className).toMatch(/optionActive/);
    expect(screen.getByRole("button", { name: "Safari" }).className).toMatch(/optionActive/);
  });
});
