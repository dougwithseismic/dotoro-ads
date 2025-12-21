import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  it("renders friendly message", () => {
    render(<EmptyState onUploadClick={vi.fn()} />);

    expect(screen.getByText(/no data sources yet/i)).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<EmptyState onUploadClick={vi.fn()} />);

    expect(
      screen.getByText(/upload.*csv.*file.*to get started/i)
    ).toBeInTheDocument();
  });

  it("renders call-to-action button", () => {
    render(<EmptyState onUploadClick={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /upload.*first.*file/i })
    ).toBeInTheDocument();
  });

  it("calls onUploadClick when CTA button is clicked", async () => {
    const onUploadClick = vi.fn();
    const user = userEvent.setup();

    render(<EmptyState onUploadClick={onUploadClick} />);

    const button = screen.getByRole("button", { name: /upload.*first.*file/i });
    await user.click(button);

    expect(onUploadClick).toHaveBeenCalledTimes(1);
  });

  it("renders an icon or illustration", () => {
    render(<EmptyState onUploadClick={vi.fn()} />);

    // Should have some visual element
    expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();
  });

  it("is accessible with proper heading hierarchy", () => {
    render(<EmptyState onUploadClick={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });
});
