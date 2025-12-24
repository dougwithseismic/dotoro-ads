"use client";

import { useMemo } from "react";
import type {
  ThreadConfig,
  CommentDefinition,
  AuthorPersona,
  CommentTreeNode,
} from "../../types";
import { interpolatePattern, buildCommentTree } from "../../types";
import styles from "./ThreadPreview.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// Using CommentTreeNode from types.ts for consistent tree building

export interface ThreadPreviewProps {
  /** Thread configuration to preview */
  config: ThreadConfig;
  /** Sample data for variable interpolation */
  sampleData?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────────────────────

interface CommentPreviewProps {
  comment: CommentDefinition;
  persona: AuthorPersona | undefined;
  children: CommentTreeNode[];
  personas: AuthorPersona[];
  sampleData?: Record<string, unknown>;
}

function CommentPreview({
  comment,
  persona,
  children,
  personas,
  sampleData,
}: CommentPreviewProps) {
  const interpolatedBody = sampleData
    ? interpolatePattern(comment.body, sampleData)
    : comment.body;

  return (
    <div
      className={styles.comment}
      data-testid={`preview-comment-${comment.id}`}
      data-depth={comment.depth}
    >
      <div className={styles.commentHeader}>
        <span className={styles.personaName}>
          {persona?.name ?? "Unknown"}
        </span>
        {persona?.role === "op" && (
          <span className={styles.opBadge}>OP</span>
        )}
      </div>
      <div className={styles.commentBody}>
        {interpolatedBody || (
          <span className={styles.placeholder}>No content</span>
        )}
      </div>
      {children.length > 0 && (
        <div className={styles.commentReplies}>
          {children.map((child) => {
            const childPersona = personas.find(
              (p) => p.id === child.comment.persona
            );
            return (
              <CommentPreview
                key={child.comment.id}
                comment={child.comment}
                persona={childPersona}
                children={child.children}
                personas={personas}
                sampleData={sampleData}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ThreadPreview renders a Reddit-like preview of the thread configuration.
 * Shows the post with interpolated variables and comments in hierarchical view.
 */
export function ThreadPreview({ config, sampleData }: ThreadPreviewProps) {
  const { post, comments, personas } = config;

  // Interpolate post content
  const interpolatedTitle = sampleData
    ? interpolatePattern(post.title, sampleData)
    : post.title;

  const interpolatedBody = sampleData && post.body
    ? interpolatePattern(post.body, sampleData)
    : post.body;

  const interpolatedSubreddit = sampleData
    ? interpolatePattern(post.subreddit, sampleData)
    : post.subreddit;

  // Build comment tree using shared utility
  const commentTree = useMemo(() => {
    return buildCommentTree(comments);
  }, [comments]);

  return (
    <div className={styles.preview} data-testid="thread-preview">
      {/* Post Section */}
      <div className={styles.post}>
        <div className={styles.postMeta}>
          <span className={styles.subreddit}>r/{interpolatedSubreddit || "subreddit"}</span>
          <span className={styles.separator}>•</span>
          <span className={styles.poster}>Posted by u/username</span>
        </div>

        <div className={styles.postBadges}>
          {post.nsfw && <span className={styles.nsfwBadge}>NSFW</span>}
          {post.spoiler && <span className={styles.spoilerBadge}>Spoiler</span>}
        </div>

        <h2 className={styles.postTitle}>
          {interpolatedTitle || (
            <span className={styles.placeholder}>Enter a title</span>
          )}
        </h2>

        <div className={styles.postBody}>
          {interpolatedBody || (
            <span className={styles.placeholder}>No content yet</span>
          )}
        </div>

        <div className={styles.postStats}>
          <span className={styles.stat}>
            <span className={styles.statIcon}>^</span>
            Vote
          </span>
          <span className={styles.stat}>
            {comments.length} Comments
          </span>
          <span className={styles.stat}>Share</span>
          <span className={styles.stat}>Save</span>
        </div>
      </div>

      {/* Comments Section */}
      {commentTree.length > 0 && (
        <div className={styles.commentsSection}>
          {commentTree.map((node) => {
            const persona = personas.find(
              (p) => p.id === node.comment.persona
            );
            return (
              <CommentPreview
                key={node.comment.id}
                comment={node.comment}
                persona={persona}
                children={node.children}
                personas={personas}
                sampleData={sampleData}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
