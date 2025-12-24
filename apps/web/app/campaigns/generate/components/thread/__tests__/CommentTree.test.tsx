import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CommentTree } from "../CommentTree";
import type { CommentDefinition, AuthorPersona } from "../../../types";
import { DEFAULT_PERSONAS } from "../../../types";

const mockComments: CommentDefinition[] = [
  {
    id: "comment-1",
    parentId: null,
    persona: "op",
    body: "Top level comment 1",
    depth: 0,
    sortOrder: 0,
  },
  {
    id: "comment-2",
    parentId: "comment-1",
    persona: "curious",
    body: "Reply to comment 1",
    depth: 1,
    sortOrder: 1,
  },
  {
    id: "comment-3",
    parentId: null,
    persona: "skeptic",
    body: "Top level comment 2",
    depth: 0,
    sortOrder: 2,
  },
];

const mockPersonas: AuthorPersona[] = DEFAULT_PERSONAS;

describe("CommentTree", () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders all comments", () => {
      render(
        <CommentTree
          comments={mockComments}
          personas={mockPersonas}
          onUpdateComment={vi.fn()}
          onDeleteComment={vi.fn()}
          onAddReply={vi.fn()}
        />
      );

      expect(
        screen.getByTestId("comment-editor-comment-1")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("comment-editor-comment-2")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("comment-editor-comment-3")
      ).toBeInTheDocument();
    });

    it("renders comments in hierarchical structure", () => {
      render(
        <CommentTree
          comments={mockComments}
          personas={mockPersonas}
          onUpdateComment={vi.fn()}
          onDeleteComment={vi.fn()}
          onAddReply={vi.fn()}
        />
      );

      // Check that child comment is nested under parent
      const parentNode = screen.getByTestId("comment-node-comment-1");
      const childNode = within(parentNode).getByTestId(
        "comment-node-comment-2"
      );
      expect(childNode).toBeInTheDocument();
    });

    it("renders add reply button for each comment", () => {
      render(
        <CommentTree
          comments={mockComments}
          personas={mockPersonas}
          onUpdateComment={vi.fn()}
          onDeleteComment={vi.fn()}
          onAddReply={vi.fn()}
        />
      );

      const replyButtons = screen.getAllByRole("button", { name: /reply/i });
      expect(replyButtons.length).toBeGreaterThan(0);
    });

    it("shows empty state when no comments", () => {
      render(
        <CommentTree
          comments={[]}
          personas={mockPersonas}
          onUpdateComment={vi.fn()}
          onDeleteComment={vi.fn()}
          onAddReply={vi.fn()}
        />
      );

      expect(screen.getByText(/no comments/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Interaction Tests
  // ==========================================================================

  describe("Interactions", () => {
    it("calls onAddReply when reply button is clicked", async () => {
      const user = userEvent.setup();
      const onAddReply = vi.fn();

      render(
        <CommentTree
          comments={mockComments}
          personas={mockPersonas}
          onUpdateComment={vi.fn()}
          onDeleteComment={vi.fn()}
          onAddReply={onAddReply}
        />
      );

      const replyButton = screen.getByTestId("reply-button-comment-1");
      await user.click(replyButton);

      expect(onAddReply).toHaveBeenCalledWith("comment-1");
    });

    it("calls onUpdateComment when comment is edited", async () => {
      const user = userEvent.setup();
      const onUpdateComment = vi.fn();

      render(
        <CommentTree
          comments={mockComments}
          personas={mockPersonas}
          onUpdateComment={onUpdateComment}
          onDeleteComment={vi.fn()}
          onAddReply={vi.fn()}
        />
      );

      const personaSelect = screen.getAllByLabelText(/persona/i)[0];
      await user.selectOptions(personaSelect, "enthusiast");

      expect(onUpdateComment).toHaveBeenCalled();
    });

    it("calls onDeleteComment when delete is clicked", async () => {
      const user = userEvent.setup();
      const onDeleteComment = vi.fn();

      render(
        <CommentTree
          comments={mockComments}
          personas={mockPersonas}
          onUpdateComment={vi.fn()}
          onDeleteComment={onDeleteComment}
          onAddReply={vi.fn()}
        />
      );

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(onDeleteComment).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Max Depth Tests
  // ==========================================================================

  describe("Max Depth", () => {
    it("hides reply button for comments at max depth", () => {
      const deepComments: CommentDefinition[] = [
        {
          id: "c1",
          parentId: null,
          persona: "op",
          body: "Depth 0",
          depth: 0,
          sortOrder: 0,
        },
        {
          id: "c2",
          parentId: "c1",
          persona: "op",
          body: "Depth 1",
          depth: 1,
          sortOrder: 1,
        },
        {
          id: "c3",
          parentId: "c2",
          persona: "op",
          body: "Depth 2",
          depth: 2,
          sortOrder: 2,
        },
        {
          id: "c4",
          parentId: "c3",
          persona: "op",
          body: "Depth 3 (max)",
          depth: 3,
          sortOrder: 3,
        },
      ];

      render(
        <CommentTree
          comments={deepComments}
          personas={mockPersonas}
          onUpdateComment={vi.fn()}
          onDeleteComment={vi.fn()}
          onAddReply={vi.fn()}
          maxDepth={3}
        />
      );

      // Reply button for depth 3 comment should not exist
      expect(screen.queryByTestId("reply-button-c4")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Collapsible Tests
  // ==========================================================================

  describe("Collapsible", () => {
    it("renders collapse toggle for comments with children", () => {
      render(
        <CommentTree
          comments={mockComments}
          personas={mockPersonas}
          onUpdateComment={vi.fn()}
          onDeleteComment={vi.fn()}
          onAddReply={vi.fn()}
        />
      );

      // Comment 1 has children
      expect(
        screen.getByTestId("collapse-toggle-comment-1")
      ).toBeInTheDocument();
    });

    it("does not render collapse toggle for comments without children", () => {
      render(
        <CommentTree
          comments={mockComments}
          personas={mockPersonas}
          onUpdateComment={vi.fn()}
          onDeleteComment={vi.fn()}
          onAddReply={vi.fn()}
        />
      );

      // Comment 2 and 3 have no children
      expect(
        screen.queryByTestId("collapse-toggle-comment-2")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("collapse-toggle-comment-3")
      ).not.toBeInTheDocument();
    });
  });
});
