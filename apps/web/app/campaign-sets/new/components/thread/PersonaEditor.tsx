"use client";

import { useState, useCallback, useEffect } from "react";
import type { AuthorPersona, PersonaRole, PersonaTone } from "../../types";
import { generateId } from "../../types";
import styles from "./PersonaEditor.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Role and Tone Options
// ─────────────────────────────────────────────────────────────────────────────

interface SelectOption<T> {
  value: T;
  label: string;
}

const ROLE_OPTIONS: SelectOption<PersonaRole>[] = [
  { value: "community_member", label: "Community Member" },
  { value: "skeptic", label: "Skeptic" },
  { value: "enthusiast", label: "Enthusiast" },
  { value: "expert", label: "Expert" },
  { value: "curious", label: "Curious" },
  { value: "moderator", label: "Moderator" },
];

const TONE_OPTIONS: SelectOption<PersonaTone>[] = [
  { value: "friendly", label: "Friendly" },
  { value: "skeptical", label: "Skeptical" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "neutral", label: "Neutral" },
  { value: "curious", label: "Curious" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface PersonaEditorProps {
  /** Existing persona to edit (undefined for create mode) */
  persona?: AuthorPersona;
  /** Callback when save is clicked with the persona data */
  onSave: (persona: AuthorPersona) => void;
  /** Callback when cancel is clicked */
  onCancel: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PersonaEditor provides a form for creating or editing author personas.
 * It supports all persona fields including name, description, role, and tone.
 */
export function PersonaEditor({
  persona,
  onSave,
  onCancel,
}: PersonaEditorProps) {
  const isEditing = !!persona;
  const isOP = persona?.id === "op";

  // Form state
  const [name, setName] = useState(persona?.name ?? "");
  const [description, setDescription] = useState(persona?.description ?? "");
  const [role, setRole] = useState<PersonaRole>(
    persona?.role ?? "community_member"
  );
  const [tone, setTone] = useState<PersonaTone>(persona?.tone ?? "neutral");

  // Reset form state when persona prop changes
  useEffect(() => {
    setName(persona?.name ?? "");
    setDescription(persona?.description ?? "");
    setRole(persona?.role ?? "community_member");
    setTone(persona?.tone ?? "neutral");
  }, [persona]);

  // Validation
  const isValid = name.trim().length > 0;

  // Handle save
  const handleSave = useCallback(() => {
    if (!isValid) return;

    const savedPersona: AuthorPersona = {
      id: persona?.id ?? generateId(),
      name: name.trim(),
      description: description.trim(),
      role,
      tone,
    };

    onSave(savedPersona);
  }, [persona?.id, name, description, role, tone, isValid, onSave]);

  // Get role options (include 'op' only when editing OP persona)
  const roleOptions = isOP
    ? [{ value: "op" as PersonaRole, label: "OP" }, ...ROLE_OPTIONS]
    : ROLE_OPTIONS;

  return (
    <div className={styles.editor} data-testid="persona-editor">
      <h3 className={styles.title}>
        {isEditing ? "Edit Persona" : "Create Persona"}
      </h3>

      <div className={styles.form}>
        <div className={styles.fieldGroup}>
          <label htmlFor="persona-name" className={styles.label}>
            Name <span className={styles.required}>*</span>
          </label>
          <input
            id="persona-name"
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter persona name"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="persona-description" className={styles.label}>
            Description
          </label>
          <textarea
            id="persona-description"
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this persona's characteristics"
            rows={3}
          />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.fieldGroup}>
            <label htmlFor="persona-role" className={styles.label}>
              Role
            </label>
            <select
              id="persona-role"
              className={styles.select}
              value={role}
              onChange={(e) => setRole(e.target.value as PersonaRole)}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="persona-tone" className={styles.label}>
              Tone
            </label>
            <select
              id="persona-tone"
              className={styles.select}
              value={tone}
              onChange={(e) => setTone(e.target.value as PersonaTone)}
            >
              {TONE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.saveButton}
          onClick={handleSave}
          disabled={!isValid}
        >
          {isEditing ? "Save Changes" : "Create Persona"}
        </button>
      </div>
    </div>
  );
}
