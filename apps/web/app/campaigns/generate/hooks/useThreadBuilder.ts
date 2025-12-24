import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type {
  ThreadConfig,
  CommentDefinition,
  AuthorPersona,
  RedditPostConfig,
  PersonaRole,
  PersonaTone,
  ValidationResult,
} from "../types";
import {
  createDefaultThreadConfig,
  createDefaultComment,
  createDefaultPersona,
  generateId,
  interpolatePattern,
  MAX_COMMENT_DEPTH,
  buildCommentTree as buildCommentTreeUtil,
  type CommentTreeNode,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UseThreadBuilderOptions {
  /** Initial thread configuration */
  initialConfig?: ThreadConfig;
  /** Callback when config changes */
  onChange: (config: ThreadConfig) => void;
  /** Sample data for preview interpolation */
  sampleData?: Record<string, unknown>;
}

// Re-export CommentTreeNode from types for backwards compatibility
export type { CommentTreeNode };

export interface PreviewData {
  post: RedditPostConfig;
  comments: CommentDefinition[];
}

export interface UseThreadBuilderResult {
  /** Current thread configuration */
  threadConfig: ThreadConfig;

  // Post management
  /** Update post fields */
  updatePost: (updates: Partial<RedditPostConfig>) => void;

  // Comment management
  /** Add a new comment (optionally as reply to parentId) */
  addComment: (parentId?: string | null) => void;
  /** Update an existing comment */
  updateComment: (commentId: string, updates: Partial<CommentDefinition>) => void;
  /** Delete a comment and its replies */
  deleteComment: (commentId: string) => void;
  /** Reorder a comment to a new position */
  reorderComments: (commentId: string, newIndex: number) => void;

  // Persona management
  /** Add a new persona */
  addPersona: (persona: Omit<AuthorPersona, "id">) => void;
  /** Update an existing persona */
  updatePersona: (personaId: string, updates: Partial<AuthorPersona>) => void;
  /** Delete a persona (except OP) */
  deletePersona: (personaId: string) => void;
  /** Get persona by ID */
  getPersonaById: (personaId: string) => AuthorPersona | undefined;

  // Comment tree helpers
  /** Get direct children of a comment */
  getCommentChildren: (parentId: string) => CommentDefinition[];
  /** Get only top-level comments */
  getTopLevelComments: () => CommentDefinition[];
  /** Build hierarchical comment tree */
  buildCommentTree: () => CommentTreeNode[];

  // Preview
  /** Get preview data with interpolated variables */
  getPreviewData: () => PreviewData;

  // Validation
  /** Validate the current configuration */
  validate: () => ValidationResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useThreadBuilder({
  initialConfig,
  onChange,
  sampleData = {},
}: UseThreadBuilderOptions): UseThreadBuilderResult {
  // Initialize state with provided config or defaults
  const [threadConfig, setThreadConfig] = useState<ThreadConfig>(() => {
    return initialConfig ?? createDefaultThreadConfig();
  });

  // Ref to track mounted state
  const isMountedRef = useRef(true);

  // Ref for onChange to avoid stale closures
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync state when initialConfig changes (e.g., when parent passes new config)
  useEffect(() => {
    if (initialConfig) {
      setThreadConfig(initialConfig);
    }
  }, [initialConfig]);

  // Helper to update state and notify parent
  const updateConfig = useCallback((newConfig: ThreadConfig) => {
    setThreadConfig(newConfig);
    queueMicrotask(() => {
      if (isMountedRef.current) {
        onChangeRef.current(newConfig);
      }
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Post Management
  // ─────────────────────────────────────────────────────────────────────────

  const updatePost = useCallback((updates: Partial<RedditPostConfig>) => {
    setThreadConfig((prev) => {
      const newConfig = {
        ...prev,
        post: { ...prev.post, ...updates },
      };
      queueMicrotask(() => {
        if (isMountedRef.current) {
          onChangeRef.current(newConfig);
        }
      });
      return newConfig;
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Comment Management
  // ─────────────────────────────────────────────────────────────────────────

  const addComment = useCallback((parentId: string | null = null) => {
    setThreadConfig((prev) => {
      let depth = 0;

      // Calculate depth based on parent
      if (parentId) {
        const parent = prev.comments.find((c) => c.id === parentId);
        if (parent) {
          depth = parent.depth + 1;
          // Enforce max depth
          if (depth > MAX_COMMENT_DEPTH) {
            depth = MAX_COMMENT_DEPTH;
          }
        }
      }

      const sortOrder = prev.comments.length;
      const newComment = createDefaultComment(parentId, depth, sortOrder);

      const newConfig = {
        ...prev,
        comments: [...prev.comments, newComment],
      };

      queueMicrotask(() => {
        if (isMountedRef.current) {
          onChangeRef.current(newConfig);
        }
      });
      return newConfig;
    });
  }, []);

  const updateComment = useCallback(
    (commentId: string, updates: Partial<CommentDefinition>) => {
      setThreadConfig((prev) => {
        const newConfig = {
          ...prev,
          comments: prev.comments.map((c) =>
            c.id === commentId ? { ...c, ...updates } : c
          ),
        };
        queueMicrotask(() => {
          if (isMountedRef.current) {
            onChangeRef.current(newConfig);
          }
        });
        return newConfig;
      });
    },
    []
  );

  const deleteComment = useCallback((commentId: string) => {
    setThreadConfig((prev) => {
      // Find all descendants (comments that have this as ancestor)
      const getDescendantIds = (id: string): string[] => {
        const directChildren = prev.comments.filter((c) => c.parentId === id);
        return [
          id,
          ...directChildren.flatMap((child) => getDescendantIds(child.id)),
        ];
      };

      const idsToDelete = new Set(getDescendantIds(commentId));
      const newComments = prev.comments
        .filter((c) => !idsToDelete.has(c.id))
        .map((c, index) => ({ ...c, sortOrder: index }));

      const newConfig = {
        ...prev,
        comments: newComments,
      };

      queueMicrotask(() => {
        if (isMountedRef.current) {
          onChangeRef.current(newConfig);
        }
      });
      return newConfig;
    });
  }, []);

  const reorderComments = useCallback((commentId: string, newIndex: number) => {
    setThreadConfig((prev) => {
      const comments = [...prev.comments];
      const currentIndex = comments.findIndex((c) => c.id === commentId);

      if (currentIndex === -1 || currentIndex === newIndex) {
        return prev;
      }

      // Remove from current position
      const [removed] = comments.splice(currentIndex, 1);
      // Insert at new position (removed is guaranteed to exist since we checked currentIndex !== -1)
      if (removed) {
        comments.splice(newIndex, 0, removed);
      }

      // Update sort orders
      const newComments = comments.map((c, index) => ({
        ...c,
        sortOrder: index,
      }));

      const newConfig = {
        ...prev,
        comments: newComments,
      };

      queueMicrotask(() => {
        if (isMountedRef.current) {
          onChangeRef.current(newConfig);
        }
      });
      return newConfig;
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Persona Management
  // ─────────────────────────────────────────────────────────────────────────

  const addPersona = useCallback((persona: Omit<AuthorPersona, "id">) => {
    setThreadConfig((prev) => {
      const newPersona: AuthorPersona = {
        ...persona,
        id: generateId(),
      };

      const newConfig = {
        ...prev,
        personas: [...prev.personas, newPersona],
      };

      queueMicrotask(() => {
        if (isMountedRef.current) {
          onChangeRef.current(newConfig);
        }
      });
      return newConfig;
    });
  }, []);

  const updatePersona = useCallback(
    (personaId: string, updates: Partial<AuthorPersona>) => {
      setThreadConfig((prev) => {
        const newConfig = {
          ...prev,
          personas: prev.personas.map((p) =>
            p.id === personaId ? { ...p, ...updates } : p
          ),
        };
        queueMicrotask(() => {
          if (isMountedRef.current) {
            onChangeRef.current(newConfig);
          }
        });
        return newConfig;
      });
    },
    []
  );

  const deletePersona = useCallback((personaId: string) => {
    // Prevent deleting the OP persona
    if (personaId === "op") {
      return;
    }

    setThreadConfig((prev) => {
      // Reassign any comments using this persona to the 'op' persona
      const updatedComments = prev.comments.map((c) =>
        c.persona === personaId ? { ...c, persona: "op" } : c
      );

      const newConfig = {
        ...prev,
        personas: prev.personas.filter((p) => p.id !== personaId),
        comments: updatedComments,
      };
      queueMicrotask(() => {
        if (isMountedRef.current) {
          onChangeRef.current(newConfig);
        }
      });
      return newConfig;
    });
  }, []);

  const getPersonaById = useCallback(
    (personaId: string): AuthorPersona | undefined => {
      return threadConfig.personas.find((p) => p.id === personaId);
    },
    [threadConfig.personas]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Comment Tree Helpers
  // ─────────────────────────────────────────────────────────────────────────

  const getCommentChildren = useCallback(
    (parentId: string): CommentDefinition[] => {
      return threadConfig.comments
        .filter((c) => c.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    [threadConfig.comments]
  );

  const getTopLevelComments = useCallback((): CommentDefinition[] => {
    return threadConfig.comments
      .filter((c) => c.depth === 0 || !c.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [threadConfig.comments]);

  const buildCommentTree = useCallback((): CommentTreeNode[] => {
    return buildCommentTreeUtil(threadConfig.comments);
  }, [threadConfig.comments]);

  // ─────────────────────────────────────────────────────────────────────────
  // Preview
  // ─────────────────────────────────────────────────────────────────────────

  const getPreviewData = useCallback((): PreviewData => {
    const interpolatedPost: RedditPostConfig = {
      ...threadConfig.post,
      title: interpolatePattern(threadConfig.post.title, sampleData),
      body: threadConfig.post.body
        ? interpolatePattern(threadConfig.post.body, sampleData)
        : undefined,
      url: threadConfig.post.url
        ? interpolatePattern(threadConfig.post.url, sampleData)
        : undefined,
      subreddit: interpolatePattern(threadConfig.post.subreddit, sampleData),
      flair: threadConfig.post.flair
        ? interpolatePattern(threadConfig.post.flair, sampleData)
        : undefined,
    };

    const interpolatedComments = threadConfig.comments.map((comment) => ({
      ...comment,
      body: interpolatePattern(comment.body, sampleData),
    }));

    return {
      post: interpolatedPost,
      comments: interpolatedComments,
    };
  }, [threadConfig, sampleData]);

  // ─────────────────────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────────────────────

  const validate = useCallback((): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate post title
    if (!threadConfig.post.title || threadConfig.post.title.trim() === "") {
      errors.push("Post title is required");
    }

    // Validate subreddit
    if (
      !threadConfig.post.subreddit ||
      threadConfig.post.subreddit.trim() === ""
    ) {
      errors.push("Subreddit is required");
    }

    // Validate URL for link posts
    if (
      threadConfig.post.type === "link" &&
      (!threadConfig.post.url || threadConfig.post.url.trim() === "")
    ) {
      errors.push("URL is required for link posts");
    }

    // Warn if text post has empty body
    if (
      threadConfig.post.type === "text" &&
      (!threadConfig.post.body || threadConfig.post.body.trim() === "")
    ) {
      warnings.push("Text posts usually include body content");
    }

    // Validate comments have personas assigned and body content
    for (const comment of threadConfig.comments) {
      const persona = threadConfig.personas.find(
        (p) => p.id === comment.persona
      );
      if (!persona) {
        warnings.push(`Comment "${comment.id}" has an invalid persona`);
      }

      // Warn if comment body is empty
      if (!comment.body || comment.body.trim() === "") {
        warnings.push("Comment has empty body");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }, [threadConfig]);

  return {
    threadConfig,
    updatePost,
    addComment,
    updateComment,
    deleteComment,
    reorderComments,
    addPersona,
    updatePersona,
    deletePersona,
    getPersonaById,
    getCommentChildren,
    getTopLevelComments,
    buildCommentTree,
    getPreviewData,
    validate,
  };
}
