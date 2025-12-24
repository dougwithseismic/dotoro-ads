"use client";

import { useCallback } from "react";
import type { ThreadConfig, AuthorPersona, CommentDefinition, RedditPostConfig } from "../../types";
import { useThreadBuilder } from "../../hooks/useThreadBuilder";
import { PostEditor } from "./PostEditor";
import { CommentTree } from "./CommentTree";
import { PersonaManager } from "./PersonaManager";
import { ThreadPreview } from "./ThreadPreview";
import styles from "./ThreadBuilder.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface ThreadBuilderProps {
  /** Current thread configuration */
  config: ThreadConfig;
  /** Callback when configuration changes */
  onChange: (config: ThreadConfig) => void;
  /** Sample data for preview interpolation */
  sampleData?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ThreadBuilder is the main component for building Reddit threads.
 * It combines PostEditor, CommentTree, PersonaManager, and ThreadPreview
 * into a cohesive interface for creating organic thread content.
 */
export function ThreadBuilder({
  config,
  onChange,
  sampleData,
}: ThreadBuilderProps) {
  const {
    threadConfig,
    updatePost,
    addComment,
    updateComment,
    deleteComment,
    addPersona,
    updatePersona,
    deletePersona,
    getPreviewData,
  } = useThreadBuilder({
    initialConfig: config,
    onChange,
    sampleData,
  });

  // Handle post updates
  const handlePostChange = useCallback(
    (updates: Partial<RedditPostConfig>) => {
      updatePost(updates);
    },
    [updatePost]
  );

  // Handle add top-level comment
  const handleAddComment = useCallback(() => {
    addComment(null);
  }, [addComment]);

  // Handle add reply
  const handleAddReply = useCallback(
    (parentId: string) => {
      addComment(parentId);
    },
    [addComment]
  );

  // Handle comment update
  const handleUpdateComment = useCallback(
    (commentId: string, updates: Partial<CommentDefinition>) => {
      updateComment(commentId, updates);
    },
    [updateComment]
  );

  // Handle comment delete
  const handleDeleteComment = useCallback(
    (commentId: string) => {
      deleteComment(commentId);
    },
    [deleteComment]
  );

  // Handle persona add
  const handleAddPersona = useCallback(
    (persona: Omit<AuthorPersona, "id">) => {
      addPersona(persona);
    },
    [addPersona]
  );

  // Handle persona update
  const handleUpdatePersona = useCallback(
    (personaId: string, updates: Partial<AuthorPersona>) => {
      updatePersona(personaId, updates);
    },
    [updatePersona]
  );

  // Handle persona delete
  const handleDeletePersona = useCallback(
    (personaId: string) => {
      deletePersona(personaId);
    },
    [deletePersona]
  );

  return (
    <div className={styles.builder} data-testid="thread-builder">
      <div className={styles.editorColumn}>
        {/* Post Editor Section */}
        <section className={styles.section}>
          <PostEditor post={threadConfig.post} onChange={handlePostChange} />
        </section>

        {/* Comments Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Comments</h3>
            <button
              type="button"
              className={styles.addButton}
              onClick={handleAddComment}
            >
              + Add Comment
            </button>
          </div>
          <CommentTree
            comments={threadConfig.comments}
            personas={threadConfig.personas}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
            onAddReply={handleAddReply}
          />
        </section>

        {/* Persona Manager Section */}
        <section className={styles.section}>
          <PersonaManager
            personas={threadConfig.personas}
            onAdd={handleAddPersona}
            onUpdate={handleUpdatePersona}
            onDelete={handleDeletePersona}
          />
        </section>
      </div>

      <div className={styles.previewColumn}>
        <div className={styles.previewSticky}>
          <h3 className={styles.previewTitle}>Preview</h3>
          <ThreadPreview config={threadConfig} sampleData={sampleData} />
        </div>
      </div>
    </div>
  );
}
