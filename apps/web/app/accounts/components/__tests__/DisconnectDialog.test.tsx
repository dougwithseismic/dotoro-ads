import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DisconnectDialog } from "../DisconnectDialog";

describe("DisconnectDialog", () => {
  it("renders when open is true", () => {
    render(
      <DisconnectDialog
        isOpen={true}
        accountName="My Account"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(
      <DisconnectDialog
        isOpen={false}
        accountName="My Account"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("displays account name in confirmation message", () => {
    render(
      <DisconnectDialog
        isOpen={true}
        accountName="My Reddit Account"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/My Reddit Account/)).toBeInTheDocument();
  });

  it("calls onConfirm when disconnect button clicked", () => {
    const handleConfirm = vi.fn();
    render(
      <DisconnectDialog
        isOpen={true}
        accountName="My Account"
        onConfirm={handleConfirm}
        onCancel={vi.fn()}
      />
    );

    const disconnectButton = screen.getByRole("button", { name: /disconnect/i });
    fireEvent.click(disconnectButton);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button clicked", () => {
    const handleCancel = vi.fn();
    render(
      <DisconnectDialog
        isOpen={true}
        accountName="My Account"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it("has accessible title", () => {
    render(
      <DisconnectDialog
        isOpen={true}
        accountName="My Account"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /disconnect account/i })).toBeInTheDocument();
  });

  it("displays warning about consequences", () => {
    render(
      <DisconnectDialog
        isOpen={true}
        accountName="My Account"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
  });

  it("disables disconnect button when loading", () => {
    render(
      <DisconnectDialog
        isOpen={true}
        accountName="My Account"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isLoading={true}
      />
    );

    const disconnectButton = screen.getByRole("button", { name: /disconnecting/i });
    expect(disconnectButton).toBeDisabled();
  });

  it("calls onCancel when Escape key is pressed", () => {
    const handleCancel = vi.fn();
    render(
      <DisconnectDialog
        isOpen={true}
        accountName="My Account"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onCancel when Escape key is pressed while loading", () => {
    const handleCancel = vi.fn();
    render(
      <DisconnectDialog
        isOpen={true}
        accountName="My Account"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
        isLoading={true}
      />
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(handleCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when clicking overlay", () => {
    const handleCancel = vi.fn();
    render(
      <DisconnectDialog
        isOpen={true}
        accountName="My Account"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    // Click on the overlay (the backdrop behind the dialog)
    const overlay = screen.getByRole("dialog").parentElement;
    fireEvent.click(overlay!);

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onCancel when clicking overlay while loading", () => {
    const handleCancel = vi.fn();
    render(
      <DisconnectDialog
        isOpen={true}
        accountName="My Account"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
        isLoading={true}
      />
    );

    // Click on the overlay (the backdrop behind the dialog)
    const overlay = screen.getByRole("dialog").parentElement;
    fireEvent.click(overlay!);

    expect(handleCancel).not.toHaveBeenCalled();
  });
});
