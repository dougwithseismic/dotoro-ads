import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CommentEditor } from "../CommentEditor";
import type { CommentDefinition, AuthorPersona } from "../../../types";
import { DEFAULT_PERSONAS } from "../../../types";

const mockComment: CommentDefinition = {
  id: "test-comment",
  parentId: null,
  persona: "op",
  body: "Test comment body",
  depth: 0,
  sortOrder: 0,
};

const mockPersonas: AuthorPersona[] = DEFAULT_PERSONAS;

describe("CommentEditor", () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders comment body textarea", () => {
      render(
        <CommentEditor
          comment={mockComment}
          personas={mockPersonas}
          onChange={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByRole("textbox", { name: /comment/i })).toBeInTheDocument();
    });

    it("renders persona selector", () => {
      render(
        <CommentEditor
          comment={mockComment}
          personas={mockPersonas}
          onChange={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByLabelText(/persona/i)).toBeInTheDocument();
    });

    it("displays current comment body", () => {
      render(
        <CommentEditor
          comment={mockComment}
          personas={mockPersonas}
          onChange={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByRole("textbox", { name: /comment/i })).toHaveValue("Test comment body");
    });

    it("displays current persona selection", () => {
      render(
        <CommentEditor
          comment={mockComment}
          personas={mockPersonas}
          onChange={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByLabelText(/persona/i)).toHaveValue("op");
    });

    it("renders delete button", () => {
      render(
        <CommentEditor
          comment={mockComment}
          personas={mockPersonas}
          onChange={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Interaction Tests
  // ==========================================================================

  describe("Interactions", () => {
    it("calls onChange when body is updated", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <CommentEditor
          comment={mockComment}
          personas={mockPersonas}
          onChange={onChange}
          onDelete={vi.fn()}
        />
      );

      const textarea = screen.getByRole("textbox", { name: /comment/i });
      await user.clear(textarea);
      await user.type(textarea, "New body text");

      expect(onChange).toHaveBeenCalled();
    });

    it("calls onChange when persona is changed", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <CommentEditor
          comment={mockComment}
          personas={mockPersonas}
          onChange={onChange}
          onDelete={vi.fn()}
        />
      );

      const personaSelect = screen.getByLabelText(/persona/i);
      await user.selectOptions(personaSelect, "skeptic");

      expect(onChange).toHaveBeenCalledWith(
        mockComment.id,
        expect.objectContaining({ persona: "skeptic" })
      );
    });

    it("calls onDelete when delete button is clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();

      render(
        <CommentEditor
          comment={mockComment}
          personas={mockPersonas}
          onChange={vi.fn()}
          onDelete={onDelete}
        />
      );

      await user.click(screen.getByRole("button", { name: /delete/i }));

      expect(onDelete).toHaveBeenCalledWith(mockComment.id);
    });
  });

  // ==========================================================================
  // Variable Support Tests
  // ==========================================================================

  describe("Variable Support", () => {
    it("shows variable hint text", () => {
      render(
        <CommentEditor
          comment={mockComment}
          personas={mockPersonas}
          onChange={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText(/\{variable\}/i)).toBeInTheDocument();
    });

    it("accepts variable patterns in body", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <CommentEditor
          comment={mockComment}
          personas={mockPersonas}
          onChange={onChange}
          onDelete={vi.fn()}
        />
      );

      const textarea = screen.getByRole("textbox", { name: /comment/i });
      await user.clear(textarea);
      await user.type(textarea, "Check out {{product_name}}!");

      expect(onChange).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Depth Indicator Tests
  // ==========================================================================

  describe("Depth Indicator", () => {
    it("shows depth indicator for nested comments", () => {
      const nestedComment: CommentDefinition = {
        ...mockComment,
        depth: 2,
      };

      render(
        <CommentEditor
          comment={nestedComment}
          personas={mockPersonas}
          onChange={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByTestId("depth-indicator")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has proper form labels", () => {
      render(
        <CommentEditor
          comment={mockComment}
          personas={mockPersonas}
          onChange={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByRole("textbox", { name: /comment/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/persona/i)).toBeInTheDocument();
    });

    it("has accessible delete button", () => {
      render(
        <CommentEditor
          comment={mockComment}
          personas={mockPersonas}
          onChange={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      expect(deleteButton).toHaveAttribute("aria-label");
    });
  });
});
