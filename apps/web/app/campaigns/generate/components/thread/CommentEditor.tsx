"use client";

import { useCallback } from "react";
import type { CommentDefinition, AuthorPersona } from "../../types";
import styles from "./CommentEditor.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface CommentEditorProps {
  /** The comment to edit */
  comment: CommentDefinition;
  /** Available personas for selection */
  personas: AuthorPersona[];
  /** Callback when comment is updated */
  onChange: (commentId: string, updates: Partial<CommentDefinition>) => void;
  /** Callback when delete is clicked */
  onDelete: (commentId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CommentEditor provides an inline form for editing a single comment.
 * Includes persona selection, body textarea with variable support, and delete action.
 */
export function CommentEditor({
  comment,
  personas,
  onChange,
  onDelete,
}: CommentEditorProps) {
  // Handle body change
  const handleBodyChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(comment.id, { body: e.target.value });
    },
    [comment.id, onChange]
  );

  // Handle persona change
  const handlePersonaChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(comment.id, { persona: e.target.value });
    },
    [comment.id, onChange]
  );

  // Handle delete
  const handleDelete = useCallback(() => {
    onDelete(comment.id);
  }, [comment.id, onDelete]);

  return (
    <div
      className={styles.editor}
      data-testid={`comment-editor-${comment.id}`}
    >
      {comment.depth > 0 && (
        <div
          className={styles.depthIndicator}
          data-testid="depth-indicator"
          style={{ width: `${comment.depth * 16}px` }}
        />
      )}

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.personaField}>
            <label htmlFor={`persona-${comment.id}`} className={styles.label}>
              Persona
            </label>
            <select
              id={`persona-${comment.id}`}
              className={styles.select}
              value={comment.persona}
              onChange={handlePersonaChange}
            >
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className={styles.deleteButton}
            onClick={handleDelete}
            aria-label={`Delete comment`}
          >
            Delete
          </button>
        </div>

        <div className={styles.bodyField}>
          <label htmlFor={`body-${comment.id}`} className={styles.label}>
            Comment
          </label>
          <textarea
            id={`body-${comment.id}`}
            className={styles.textarea}
            value={comment.body}
            onChange={handleBodyChange}
            placeholder="Write your comment..."
            rows={3}
          />
          <p className={styles.hint}>
            Use {"{variable}"} syntax to insert dynamic values from your data
            source.
          </p>
        </div>
      </div>
    </div>
  );
}
