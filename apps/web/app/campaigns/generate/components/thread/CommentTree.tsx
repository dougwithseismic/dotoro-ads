"use client";

import { useState, useCallback, useMemo } from "react";
import type { CommentDefinition, AuthorPersona, CommentTreeNode } from "../../types";
import { MAX_COMMENT_DEPTH, buildCommentTree } from "../../types";
import { CommentEditor } from "./CommentEditor";
import styles from "./CommentTree.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// Using CommentTreeNode from types.ts for consistent tree building

export interface CommentTreeProps {
  /** List of all comments */
  comments: CommentDefinition[];
  /** Available personas */
  personas: AuthorPersona[];
  /** Callback when a comment is updated */
  onUpdateComment: (
    commentId: string,
    updates: Partial<CommentDefinition>
  ) => void;
  /** Callback when a comment is deleted */
  onDeleteComment: (commentId: string) => void;
  /** Callback when reply is clicked */
  onAddReply: (parentId: string) => void;
  /** Maximum depth for replies (default: 3) */
  maxDepth?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────────────────────

interface CommentNodeRendererProps {
  node: CommentTreeNode;
  personas: AuthorPersona[];
  onUpdate: (commentId: string, updates: Partial<CommentDefinition>) => void;
  onDelete: (commentId: string) => void;
  onAddReply: (parentId: string) => void;
  maxDepth: number;
  collapsedIds: Set<string>;
  onToggleCollapse: (commentId: string) => void;
}

function CommentNodeRenderer({
  node,
  personas,
  onUpdate,
  onDelete,
  onAddReply,
  maxDepth,
  collapsedIds,
  onToggleCollapse,
}: CommentNodeRendererProps) {
  const { comment, children } = node;
  const hasChildren = children.length > 0;
  const isCollapsed = collapsedIds.has(comment.id);
  const canAddReply = comment.depth < maxDepth;

  return (
    <div
      className={styles.commentNode}
      data-testid={`comment-node-${comment.id}`}
    >
      <div className={styles.commentHeader}>
        {hasChildren && (
          <button
            type="button"
            className={styles.collapseToggle}
            onClick={() => onToggleCollapse(comment.id)}
            data-testid={`collapse-toggle-${comment.id}`}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand replies" : "Collapse replies"}
          >
            <span
              className={`${styles.collapseIcon} ${isCollapsed ? styles.collapsed : ""}`}
            >
              &#9660;
            </span>
          </button>
        )}
      </div>

      <CommentEditor
        comment={comment}
        personas={personas}
        onChange={onUpdate}
        onDelete={onDelete}
      />

      <div className={styles.commentActions}>
        {canAddReply && (
          <button
            type="button"
            className={styles.replyButton}
            onClick={() => onAddReply(comment.id)}
            data-testid={`reply-button-${comment.id}`}
          >
            + Reply
          </button>
        )}
      </div>

      {hasChildren && !isCollapsed && (
        <div className={styles.childComments}>
          {children.map((child) => (
            <CommentNodeRenderer
              key={child.comment.id}
              node={child}
              personas={personas}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddReply={onAddReply}
              maxDepth={maxDepth}
              collapsedIds={collapsedIds}
              onToggleCollapse={onToggleCollapse}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CommentTree renders a hierarchical tree of comments with editing capabilities.
 * Supports nesting up to maxDepth levels, with collapsible threads.
 */
export function CommentTree({
  comments,
  personas,
  onUpdateComment,
  onDeleteComment,
  onAddReply,
  maxDepth = MAX_COMMENT_DEPTH,
}: CommentTreeProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Build tree structure from flat comments array using shared utility
  const commentTree = useMemo(() => {
    return buildCommentTree(comments);
  }, [comments]);

  // Toggle collapse state
  const handleToggleCollapse = useCallback((commentId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }, []);

  if (comments.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No comments yet. Add a comment to start building the thread.</p>
      </div>
    );
  }

  return (
    <div className={styles.tree}>
      {commentTree.map((node) => (
        <CommentNodeRenderer
          key={node.comment.id}
          node={node}
          personas={personas}
          onUpdate={onUpdateComment}
          onDelete={onDeleteComment}
          onAddReply={onAddReply}
          maxDepth={maxDepth}
          collapsedIds={collapsedIds}
          onToggleCollapse={handleToggleCollapse}
        />
      ))}
    </div>
  );
}
