import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UploadZone } from "../UploadZone";

describe("UploadZone", () => {
  let onUpload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onUpload = vi.fn();
  });

  it("renders upload zone with instructions", () => {
    render(<UploadZone onUpload={onUpload} />);

    expect(
      screen.getByText(/drag and drop.*csv.*file/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
  });

  it("accepts CSV files only", () => {
    render(<UploadZone onUpload={onUpload} />);

    const input = screen.getByTestId("file-input") as HTMLInputElement;
    expect(input.accept).toBe(".csv");
  });

  it("shows drag active state when file is dragged over", () => {
    const { container } = render(<UploadZone onUpload={onUpload} />);

    const dropZone = container.querySelector("[data-testid='drop-zone']")!;

    fireEvent.dragEnter(dropZone, {
      dataTransfer: { types: ["Files"] },
    });

    expect(dropZone).toHaveAttribute("data-drag-active", "true");
  });

  it("removes drag active state when file is dragged out", () => {
    const { container } = render(<UploadZone onUpload={onUpload} />);

    const dropZone = container.querySelector("[data-testid='drop-zone']")!;

    fireEvent.dragEnter(dropZone, {
      dataTransfer: { types: ["Files"] },
    });

    fireEvent.dragLeave(dropZone);

    expect(dropZone).toHaveAttribute("data-drag-active", "false");
  });

  it("calls onUpload with file when valid CSV is dropped", async () => {
    const { container } = render(<UploadZone onUpload={onUpload} />);

    const dropZone = container.querySelector("[data-testid='drop-zone']")!;
    const file = new File(["name,price\nProduct,100"], "test.csv", {
      type: "text/csv",
    });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(file);
    });
  });

  it("rejects non-CSV files", async () => {
    const { container } = render(<UploadZone onUpload={onUpload} />);

    const dropZone = container.querySelector("[data-testid='drop-zone']")!;
    const file = new File(["invalid content"], "test.txt", {
      type: "text/plain",
    });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(onUpload).not.toHaveBeenCalled();
      expect(screen.getByText(/only csv files/i)).toBeInTheDocument();
    });
  });

  it("calls onUpload when file is selected via input", async () => {
    const user = userEvent.setup();
    render(<UploadZone onUpload={onUpload} />);

    const input = screen.getByTestId("file-input") as HTMLInputElement;
    const file = new File(["name,price\nProduct,100"], "test.csv", {
      type: "text/csv",
    });

    await user.upload(input, file);

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(file);
    });
  });

  it("shows uploading state when isUploading is true", () => {
    render(<UploadZone onUpload={onUpload} isUploading />);

    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
  });

  it("disables interaction when isUploading is true", () => {
    render(<UploadZone onUpload={onUpload} isUploading />);

    const input = screen.getByTestId("file-input") as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it("shows error message when error prop is set", () => {
    render(<UploadZone onUpload={onUpload} error="Upload failed" />);

    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });

  it("opens file picker when zone is clicked", async () => {
    const user = userEvent.setup();
    render(<UploadZone onUpload={onUpload} />);

    const input = screen.getByTestId("file-input") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    const dropZone = screen.getByTestId("drop-zone");
    await user.click(dropZone);

    expect(clickSpy).toHaveBeenCalled();
  });

  describe("Upload Progress", () => {
    it("shows progress bar when uploading with progress value", () => {
      render(<UploadZone onUpload={onUpload} isUploading uploadProgress={45} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute("aria-valuenow", "45");
    });

    it("displays progress percentage text", () => {
      render(<UploadZone onUpload={onUpload} isUploading uploadProgress={75} />);

      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("shows indeterminate spinner when uploading without progress", () => {
      render(<UploadZone onUpload={onUpload} isUploading />);

      // Should show spinner, not progress bar
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });

    it("displays file name when uploading", () => {
      render(
        <UploadZone
          onUpload={onUpload}
          isUploading
          uploadProgress={30}
          uploadingFileName="products.csv"
        />
      );

      expect(screen.getByText("products.csv")).toBeInTheDocument();
    });

    it("progress bar shows correct min and max values", () => {
      render(<UploadZone onUpload={onUpload} isUploading uploadProgress={50} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuemin", "0");
      expect(progressBar).toHaveAttribute("aria-valuemax", "100");
    });
  });
});
