"use client";

import type { AuthorPersona, PersonaRole, PersonaTone } from "../../types";
import styles from "./PersonaCard.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Role and Tone Display Mappings
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<PersonaRole, string> = {
  op: "OP",
  community_member: "Community Member",
  skeptic: "Skeptic",
  enthusiast: "Enthusiast",
  expert: "Expert",
  curious: "Curious",
  moderator: "Moderator",
};

const ROLE_ICONS: Record<PersonaRole, string> = {
  op: "M", // Microphone for OP
  community_member: "U", // User
  skeptic: "?", // Question
  enthusiast: "!", // Exclamation
  expert: "E", // Expert
  curious: "C", // Curious
  moderator: "S", // Shield
};

const TONE_LABELS: Record<PersonaTone, string> = {
  friendly: "Friendly",
  skeptical: "Skeptical",
  enthusiastic: "Enthusiastic",
  neutral: "Neutral",
  curious: "Curious",
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface PersonaCardProps {
  /** The persona to display */
  persona: AuthorPersona;
  /** Callback when edit is clicked */
  onEdit: (persona: AuthorPersona) => void;
  /** Callback when delete is clicked */
  onDelete: (personaId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PersonaCard displays a single author persona with edit/delete actions.
 * The OP persona cannot be deleted but can be edited.
 */
export function PersonaCard({ persona, onEdit, onDelete }: PersonaCardProps) {
  const isOP = persona.id === "op";
  const roleLabel = ROLE_LABELS[persona.role] ?? persona.role;
  const roleIcon = ROLE_ICONS[persona.role] ?? "U";
  const toneLabel = persona.tone ? TONE_LABELS[persona.tone] : null;

  return (
    <article
      className={styles.card}
      aria-label={`Persona: ${persona.name}`}
      data-testid={`persona-card-${persona.id}`}
    >
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <span className={styles.icon} aria-hidden="true">
            {roleIcon}
          </span>
        </div>
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{persona.name}</span>
            {isOP && <span className={styles.defaultBadge}>Default</span>}
          </div>
          <p className={styles.description}>{persona.description}</p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.editButton}
            onClick={() => onEdit(persona)}
            aria-label={`Edit ${persona.name}`}
          >
            Edit
          </button>
          {!isOP && (
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => onDelete(persona.id)}
              aria-label={`Delete ${persona.name}`}
            >
              Delete
            </button>
          )}
        </div>
      </div>
      <div className={styles.metadata}>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>Role:</span>
          <span className={styles.metaValue}>{roleLabel}</span>
        </span>
        {toneLabel && (
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Tone:</span>
            <span className={styles.metaValue}>{toneLabel}</span>
          </span>
        )}
      </div>
    </article>
  );
}
