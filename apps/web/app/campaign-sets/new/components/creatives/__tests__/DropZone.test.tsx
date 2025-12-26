import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DropZone } from "../DropZone";

describe("DropZone", () => {
  let onFileSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onFileSelect = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders with label and description", () => {
    render(
      <DropZone
        label="Primary Image"
        description="Recommended: 1200 x 628 (1.91:1)"
        accept={["image/jpeg", "image/png"]}
        onFileSelect={onFileSelect}
      />
    );

    expect(screen.getByText("Primary Image")).toBeInTheDocument();
    expect(
      screen.getByText("Recommended: 1200 x 628 (1.91:1)")
    ).toBeInTheDocument();
  });

  it("displays accepted formats", () => {
    render(
      <DropZone
        label="Image"
        accept={["image/jpeg", "image/png", "image/gif"]}
        onFileSelect={onFileSelect}
      />
    );

    expect(screen.getByText(/JPG, PNG, GIF/i)).toBeInTheDocument();
  });

  it("displays max file size when provided", () => {
    render(
      <DropZone
        label="Image"
        accept={["image/jpeg"]}
        onFileSelect={onFileSelect}
        maxSize={5 * 1024 * 1024}
      />
    );

    expect(screen.getByText(/Max: 5 MB/i)).toBeInTheDocument();
  });

  it("opens file picker when clicked", () => {
    render(
      <DropZone
        label="Image"
        accept={["image/jpeg"]}
        onFileSelect={onFileSelect}
      />
    );

    const dropZone = screen.getByTestId("dropzone");
    const input = screen.getByTestId("dropzone-input") as HTMLInputElement;

    // Mock click on input
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.click(dropZone);
    expect(clickSpy).toHaveBeenCalled();
  });

  it("calls onFileSelect when file is selected via input", async () => {
    render(
      <DropZone
        label="Image"
        accept={["image/jpeg"]}
        onFileSelect={onFileSelect}
      />
    );

    const input = screen.getByTestId("dropzone-input") as HTMLInputElement;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onFileSelect).toHaveBeenCalledWith(file);
    });
  });

  it("shows drag active state when dragging over", () => {
    render(
      <DropZone
        label="Image"
        accept={["image/jpeg"]}
        onFileSelect={onFileSelect}
      />
    );

    const dropZone = screen.getByTestId("dropzone");

    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveAttribute("data-dragging", "true");

    fireEvent.dragLeave(dropZone);
    expect(dropZone).toHaveAttribute("data-dragging", "false");
  });

  it("calls onFileSelect when valid file is dropped", async () => {
    render(
      <DropZone
        label="Image"
        accept={["image/jpeg", "image/png"]}
        onFileSelect={onFileSelect}
      />
    );

    const dropZone = screen.getByTestId("dropzone");
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    // Create mock DataTransfer
    const dataTransfer = {
      files: [file],
      items: [{ kind: "file", type: "image/jpeg", getAsFile: () => file }],
      types: ["Files"],
    };

    fireEvent.drop(dropZone, { dataTransfer });

    await waitFor(() => {
      expect(onFileSelect).toHaveBeenCalledWith(file);
    });
  });

  it("does not call onFileSelect when disabled", async () => {
    render(
      <DropZone
        label="Image"
        accept={["image/jpeg"]}
        onFileSelect={onFileSelect}
        disabled
      />
    );

    const input = screen.getByTestId("dropzone-input") as HTMLInputElement;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onFileSelect).not.toHaveBeenCalled();
    });
  });

  it("shows error state when error prop is provided", () => {
    render(
      <DropZone
        label="Image"
        accept={["image/jpeg"]}
        onFileSelect={onFileSelect}
        error="File too large"
      />
    );

    expect(screen.getByText("File too large")).toBeInTheDocument();
    const dropZone = screen.getByTestId("dropzone");
    expect(dropZone).toHaveAttribute("data-error", "true");
  });

  it("displays loading state when isLoading is true", () => {
    render(
      <DropZone
        label="Image"
        accept={["image/jpeg"]}
        onFileSelect={onFileSelect}
        isLoading
      />
    );

    expect(screen.getByTestId("dropzone-loading")).toBeInTheDocument();
  });

  it("shows custom icon when provided", () => {
    render(
      <DropZone
        label="Video"
        accept={["video/mp4"]}
        onFileSelect={onFileSelect}
        icon="video"
      />
    );

    expect(screen.getByTestId("dropzone-icon-video")).toBeInTheDocument();
  });

  it("correctly identifies video accept types", () => {
    render(
      <DropZone
        label="Video"
        accept={["video/mp4", "video/webm"]}
        onFileSelect={onFileSelect}
      />
    );

    expect(screen.getByText(/MP4, WebM/i)).toBeInTheDocument();
  });
});
