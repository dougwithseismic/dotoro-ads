import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DefaultRoleSelector } from "../DefaultRoleSelector";

describe("DefaultRoleSelector", () => {
  const defaultProps = {
    currentRole: "viewer" as const,
    onRoleChange: vi.fn().mockResolvedValue(undefined),
    canEdit: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the role selector component", () => {
      render(<DefaultRoleSelector {...defaultProps} />);

      expect(screen.getByTestId("default-role-selector")).toBeInTheDocument();
    });

    it("displays the current role", () => {
      render(<DefaultRoleSelector {...defaultProps} currentRole="editor" />);

      expect(screen.getByRole("combobox")).toHaveTextContent(/editor/i);
    });

    it("displays label text", () => {
      render(<DefaultRoleSelector {...defaultProps} />);

      expect(screen.getByText(/default role for new invites/i)).toBeInTheDocument();
    });

    it("shows all non-owner role options", () => {
      render(<DefaultRoleSelector {...defaultProps} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      expect(screen.getByRole("option", { name: /viewer/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /editor/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /admin/i })).toBeInTheDocument();
    });

    it("does not include owner role option", () => {
      render(<DefaultRoleSelector {...defaultProps} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      expect(screen.queryByRole("option", { name: /^owner$/i })).not.toBeInTheDocument();
    });
  });

  describe("role selection", () => {
    it("calls onRoleChange when a role is selected", async () => {
      render(<DefaultRoleSelector {...defaultProps} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      const editorOption = screen.getByRole("option", { name: /editor/i });
      fireEvent.click(editorOption);

      await waitFor(() => {
        expect(defaultProps.onRoleChange).toHaveBeenCalledWith("editor");
      });
    });

    it("updates displayed value after selection", async () => {
      const { rerender } = render(<DefaultRoleSelector {...defaultProps} currentRole="viewer" />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      const editorOption = screen.getByRole("option", { name: /editor/i });
      fireEvent.click(editorOption);

      // Simulate parent updating the prop after save
      rerender(<DefaultRoleSelector {...defaultProps} currentRole="editor" />);

      expect(screen.getByRole("combobox")).toHaveTextContent(/editor/i);
    });
  });

  describe("permission control", () => {
    it("disables dropdown when canEdit is false", () => {
      render(<DefaultRoleSelector {...defaultProps} canEdit={false} />);

      const combobox = screen.getByRole("combobox");
      expect(combobox).toBeDisabled();
    });

    it("enables dropdown when canEdit is true", () => {
      render(<DefaultRoleSelector {...defaultProps} canEdit={true} />);

      const combobox = screen.getByRole("combobox");
      expect(combobox).not.toBeDisabled();
    });

    it("shows helper text for non-admins when canEdit is false", () => {
      render(<DefaultRoleSelector {...defaultProps} canEdit={false} />);

      expect(screen.getByText(/only admins and owners/i)).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows loading indicator while saving", async () => {
      const slowSave = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<DefaultRoleSelector {...defaultProps} onRoleChange={slowSave} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      const editorOption = screen.getByRole("option", { name: /editor/i });
      fireEvent.click(editorOption);

      expect(await screen.findByTestId("role-saving")).toBeInTheDocument();
    });

    it("disables dropdown while saving", async () => {
      const slowSave = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<DefaultRoleSelector {...defaultProps} onRoleChange={slowSave} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      const editorOption = screen.getByRole("option", { name: /editor/i });
      fireEvent.click(editorOption);

      await waitFor(() => {
        expect(screen.getByRole("combobox")).toBeDisabled();
      });
    });
  });

  describe("error handling", () => {
    it("shows error message when save fails", async () => {
      const failingSave = vi.fn().mockRejectedValue(new Error("Save failed"));
      render(<DefaultRoleSelector {...defaultProps} onRoleChange={failingSave} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      const editorOption = screen.getByRole("option", { name: /editor/i });
      fireEvent.click(editorOption);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/save failed/i);
      });
    });
  });

  describe("accessibility", () => {
    it("has proper label association", () => {
      render(<DefaultRoleSelector {...defaultProps} />);

      expect(screen.getByLabelText(/default role/i)).toBeInTheDocument();
    });

    it("dropdown options are focusable", () => {
      render(<DefaultRoleSelector {...defaultProps} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      const options = screen.getAllByRole("option");
      options.forEach((option) => {
        expect(option).toHaveAttribute("tabindex");
      });
    });
  });

  describe("role descriptions", () => {
    it("shows description for each role option", () => {
      render(<DefaultRoleSelector {...defaultProps} />);

      const combobox = screen.getByRole("combobox");
      fireEvent.click(combobox);

      // Each role should have a description
      expect(screen.getByText(/view only access/i)).toBeInTheDocument();
      expect(screen.getByText(/can edit/i)).toBeInTheDocument();
      expect(screen.getByText(/full management/i)).toBeInTheDocument();
    });
  });
});
