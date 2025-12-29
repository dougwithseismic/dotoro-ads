import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AccountStatus } from "../AccountStatus";

describe("AccountStatus", () => {
  it("displays connected status with correct styling", () => {
    const { container } = render(<AccountStatus status="connected" />);

    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-status", "connected");
  });

  it("displays token_expired status with correct label", () => {
    const { container } = render(<AccountStatus status="token_expired" />);

    expect(screen.getByText("Token Expired")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-status", "token_expired");
  });

  it("displays error status with correct label", () => {
    const { container } = render(<AccountStatus status="error" />);

    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-status", "error");
  });

  it("has proper accessibility attributes", () => {
    render(<AccountStatus status="connected" />);

    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("aria-label", "Account status: Connected");
  });

  it("renders status icon", () => {
    const { container } = render(<AccountStatus status="connected" />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
