"use client";

import { useState, useCallback } from "react";
import type { AuthorPersona } from "../../types";
import { PersonaCard } from "./PersonaCard";
import { PersonaEditor } from "./PersonaEditor";
import styles from "./PersonaManager.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type EditorMode = "closed" | "add" | "edit";

export interface PersonaManagerProps {
  /** List of personas to display */
  personas: AuthorPersona[];
  /** Callback when a new persona is added */
  onAdd: (persona: Omit<AuthorPersona, "id">) => void;
  /** Callback when a persona is updated */
  onUpdate: (personaId: string, updates: Partial<AuthorPersona>) => void;
  /** Callback when a persona is deleted */
  onDelete: (personaId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PersonaManager provides a UI for managing author personas.
 * Includes a list of personas with add/edit/delete functionality.
 */
export function PersonaManager({
  personas,
  onAdd,
  onUpdate,
  onDelete,
}: PersonaManagerProps) {
  const [editorMode, setEditorMode] = useState<EditorMode>("closed");
  const [editingPersona, setEditingPersona] = useState<AuthorPersona | null>(
    null
  );

  // Handle add button click
  const handleAddClick = useCallback(() => {
    setEditingPersona(null);
    setEditorMode("add");
  }, []);

  // Handle edit button click
  const handleEditClick = useCallback((persona: AuthorPersona) => {
    setEditingPersona(persona);
    setEditorMode("edit");
  }, []);

  // Handle save from editor
  const handleSave = useCallback(
    (persona: AuthorPersona) => {
      if (editorMode === "add") {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...personaData } = persona;
        onAdd(personaData);
      } else if (editorMode === "edit" && editingPersona) {
        onUpdate(editingPersona.id, persona);
      }
      setEditorMode("closed");
      setEditingPersona(null);
    },
    [editorMode, editingPersona, onAdd, onUpdate]
  );

  // Handle cancel from editor
  const handleCancel = useCallback(() => {
    setEditorMode("closed");
    setEditingPersona(null);
  }, []);

  // Handle delete
  const handleDelete = useCallback(
    (personaId: string) => {
      onDelete(personaId);
    },
    [onDelete]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Personas</h3>
        <button
          type="button"
          className={styles.addButton}
          onClick={handleAddClick}
          disabled={editorMode !== "closed"}
        >
          + Add Persona
        </button>
      </div>

      {editorMode !== "closed" && (
        <div className={styles.editorWrapper}>
          <PersonaEditor
            persona={editingPersona ?? undefined}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}

      {personas.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No personas defined. Add a persona to get started.</p>
        </div>
      ) : (
        <div className={styles.personaList}>
          {personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              onEdit={handleEditClick}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
