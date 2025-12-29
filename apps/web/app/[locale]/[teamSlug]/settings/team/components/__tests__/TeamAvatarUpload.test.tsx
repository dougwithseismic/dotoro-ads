import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeamAvatarUpload } from "../TeamAvatarUpload";

describe("TeamAvatarUpload", () => {
  const defaultProps = {
    teamName: "Test Team",
    avatarUrl: null,
    onUpload: vi.fn().mockResolvedValue(undefined),
    isOwnerOrAdmin: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the avatar upload component", () => {
      render(<TeamAvatarUpload {...defaultProps} />);

      expect(screen.getByTestId("team-avatar-upload")).toBeInTheDocument();
    });

    it("displays initials when no avatar URL", () => {
      render(<TeamAvatarUpload {...defaultProps} teamName="Test Team" />);

      expect(screen.getByText("TT")).toBeInTheDocument();
    });

    it("displays single initial for single word team name", () => {
      render(<TeamAvatarUpload {...defaultProps} teamName="Acme" />);

      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("displays avatar image when avatarUrl is provided", () => {
      render(
        <TeamAvatarUpload
          {...defaultProps}
          avatarUrl="https://example.com/avatar.jpg"
        />
      );

      const img = screen.getByRole("img", { name: "Test Team avatar" });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    });
  });

  describe("upload functionality", () => {
    it("shows upload button for owners/admins", () => {
      render(<TeamAvatarUpload {...defaultProps} isOwnerOrAdmin={true} />);

      expect(screen.getByRole("button", { name: /change avatar/i })).toBeInTheDocument();
    });

    it("hides upload button for viewers/editors", () => {
      render(<TeamAvatarUpload {...defaultProps} isOwnerOrAdmin={false} />);

      expect(screen.queryByRole("button", { name: /change avatar/i })).not.toBeInTheDocument();
    });

    it("has hidden file input for image upload", () => {
      render(<TeamAvatarUpload {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute("accept", "image/jpeg,image/png,image/webp,image/gif");
    });

    it("triggers file input when upload button is clicked", () => {
      render(<TeamAvatarUpload {...defaultProps} />);

      const button = screen.getByRole("button", { name: /change avatar/i });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, "click");

      fireEvent.click(button);

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe("file validation", () => {
    it("validates file type", async () => {
      render(<TeamAvatarUpload {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Create a PDF file (invalid type)
      const invalidFile = new File(["content"], "test.pdf", { type: "application/pdf" });
      Object.defineProperty(fileInput, "files", { value: [invalidFile] });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/invalid file type/i);
      });

      expect(defaultProps.onUpload).not.toHaveBeenCalled();
    });

    it("validates file size (max 2MB)", async () => {
      render(<TeamAvatarUpload {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Create a large file (> 2MB)
      const largeContent = new Array(2 * 1024 * 1024 + 1).fill("x").join("");
      const largeFile = new File([largeContent], "large.jpg", { type: "image/jpeg" });
      Object.defineProperty(fileInput, "files", { value: [largeFile] });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/file too large/i);
      });

      expect(defaultProps.onUpload).not.toHaveBeenCalled();
    });

    it("accepts valid image files", async () => {
      render(<TeamAvatarUpload {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const validFile = new File(["image content"], "avatar.jpg", { type: "image/jpeg" });
      Object.defineProperty(fileInput, "files", { value: [validFile] });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(defaultProps.onUpload).toHaveBeenCalledWith(validFile);
      });
    });
  });

  describe("loading state", () => {
    it("shows loading indicator while uploading", async () => {
      const slowUpload = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<TeamAvatarUpload {...defaultProps} onUpload={slowUpload} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile = new File(["image content"], "avatar.jpg", { type: "image/jpeg" });
      Object.defineProperty(fileInput, "files", { value: [validFile] });

      fireEvent.change(fileInput);

      expect(await screen.findByTestId("upload-loading")).toBeInTheDocument();
    });

    it("disables upload button while uploading", async () => {
      const slowUpload = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<TeamAvatarUpload {...defaultProps} onUpload={slowUpload} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile = new File(["image content"], "avatar.jpg", { type: "image/jpeg" });
      Object.defineProperty(fileInput, "files", { value: [validFile] });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /uploading/i })).toBeDisabled();
      });
    });
  });

  describe("error handling", () => {
    it("shows error message when upload fails", async () => {
      const failingUpload = vi.fn().mockRejectedValue(new Error("Upload failed"));
      render(<TeamAvatarUpload {...defaultProps} onUpload={failingUpload} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile = new File(["image content"], "avatar.jpg", { type: "image/jpeg" });
      Object.defineProperty(fileInput, "files", { value: [validFile] });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/upload failed/i);
      });
    });

    it("clears error when new upload is started", async () => {
      const failingThenSucceedingUpload = vi
        .fn()
        .mockRejectedValueOnce(new Error("Upload failed"))
        .mockResolvedValueOnce(undefined);

      const { rerender } = render(<TeamAvatarUpload {...defaultProps} onUpload={failingThenSucceedingUpload} />);

      const validFile = new File(["image content"], "avatar.jpg", { type: "image/jpeg" });

      // Get a fresh file input and trigger first upload (which fails)
      const fileInput1 = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput1, "files", { value: [validFile], configurable: true });
      fireEvent.change(fileInput1);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Re-render to get a fresh file input and trigger second upload
      rerender(<TeamAvatarUpload {...defaultProps} onUpload={failingThenSucceedingUpload} />);

      const fileInput2 = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile2 = new File(["image content 2"], "avatar2.jpg", { type: "image/jpeg" });
      Object.defineProperty(fileInput2, "files", { value: [validFile2], configurable: true });
      fireEvent.change(fileInput2);

      await waitFor(() => {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("has proper aria-label on avatar container", () => {
      render(<TeamAvatarUpload {...defaultProps} teamName="Test Team" />);

      expect(
        screen.getByLabelText("Test Team team avatar")
      ).toBeInTheDocument();
    });

    it("hides file input from screen readers until activated", () => {
      render(<TeamAvatarUpload {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toHaveClass("sr-only");
    });
  });

  describe("styling", () => {
    it("displays circular avatar", () => {
      render(<TeamAvatarUpload {...defaultProps} />);

      const avatarContainer = screen.getByTestId("avatar-container");
      expect(avatarContainer).toHaveClass("rounded-full");
    });
  });
});
