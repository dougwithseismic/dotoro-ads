"use client";

import { useCallback } from "react";
import type { RedditPostConfig, RedditPostType } from "../../types";
import styles from "./PostEditor.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Post Type Options
// ─────────────────────────────────────────────────────────────────────────────

const POST_TYPE_OPTIONS: Array<{ value: RedditPostType; label: string }> = [
  { value: "text", label: "Text Post" },
  { value: "link", label: "Link Post" },
  { value: "image", label: "Image Post" },
  { value: "video", label: "Video Post" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface PostEditorProps {
  /** The post configuration to edit */
  post: RedditPostConfig;
  /** Callback when post is updated */
  onChange: (updates: Partial<RedditPostConfig>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PostEditor provides a form for editing Reddit post configuration.
 * Supports title, body, subreddit, post type, and optional flags.
 */
export function PostEditor({ post, onChange }: PostEditorProps) {
  // Handle field changes
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ title: e.target.value });
    },
    [onChange]
  );

  const handleBodyChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ body: e.target.value });
    },
    [onChange]
  );

  const handleSubredditChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ subreddit: e.target.value });
    },
    [onChange]
  );

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ type: e.target.value as RedditPostType });
    },
    [onChange]
  );

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ url: e.target.value });
    },
    [onChange]
  );

  const handleFlairChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ flair: e.target.value });
    },
    [onChange]
  );

  const handleNsfwChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ nsfw: e.target.checked });
    },
    [onChange]
  );

  const handleSpoilerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ spoiler: e.target.checked });
    },
    [onChange]
  );

  const showUrlField = post.type === "link";

  return (
    <div className={styles.editor} data-testid="post-editor">
      <h3 className={styles.title}>Post Configuration</h3>

      <div className={styles.form}>
        {/* Title Field */}
        <div className={styles.fieldGroup}>
          <label htmlFor="post-title" className={styles.label}>
            Title <span className={styles.required}>*</span>
          </label>
          <input
            id="post-title"
            type="text"
            className={styles.input}
            value={post.title}
            onChange={handleTitleChange}
            placeholder="Enter your post title"
          />
        </div>

        {/* Body Field */}
        <div className={styles.fieldGroup}>
          <label htmlFor="post-body" className={styles.label}>
            Body
          </label>
          <textarea
            id="post-body"
            className={styles.textarea}
            value={post.body ?? ""}
            onChange={handleBodyChange}
            placeholder="Write your post content (supports Markdown)"
            rows={6}
          />
        </div>

        {/* Type and Subreddit Row */}
        <div className={styles.fieldRow}>
          <div className={styles.fieldGroup}>
            <label htmlFor="post-type" className={styles.label}>
              Post Type
            </label>
            <select
              id="post-type"
              className={styles.select}
              value={post.type}
              onChange={handleTypeChange}
            >
              {POST_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="post-subreddit" className={styles.label}>
              Subreddit <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWithPrefix}>
              <span className={styles.inputPrefix}>r/</span>
              <input
                id="post-subreddit"
                type="text"
                className={styles.inputWithPrefixInput}
                value={post.subreddit}
                onChange={handleSubredditChange}
                placeholder="subreddit"
              />
            </div>
          </div>
        </div>

        {/* URL Field (for link posts) */}
        {showUrlField && (
          <div className={styles.fieldGroup}>
            <label htmlFor="post-url" className={styles.label}>
              URL <span className={styles.required}>*</span>
            </label>
            <input
              id="post-url"
              type="url"
              className={styles.input}
              value={post.url ?? ""}
              onChange={handleUrlChange}
              placeholder="https://example.com"
            />
          </div>
        )}

        {/* Flair Field */}
        <div className={styles.fieldGroup}>
          <label htmlFor="post-flair" className={styles.label}>
            Flair
          </label>
          <input
            id="post-flair"
            type="text"
            className={styles.input}
            value={post.flair ?? ""}
            onChange={handleFlairChange}
            placeholder="Optional post flair"
          />
        </div>

        {/* Toggles Row */}
        <div className={styles.toggleRow}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={post.nsfw ?? false}
              onChange={handleNsfwChange}
            />
            <span>NSFW</span>
          </label>

          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={post.spoiler ?? false}
              onChange={handleSpoilerChange}
            />
            <span>Spoiler</span>
          </label>
        </div>

        <p className={styles.hint}>
          Use {"{variable}"} syntax to insert dynamic values from your data
          source.
        </p>
      </div>
    </div>
  );
}
