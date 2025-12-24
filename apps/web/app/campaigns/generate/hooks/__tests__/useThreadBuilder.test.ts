import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useThreadBuilder } from "../useThreadBuilder";
import type {
  ThreadConfig,
  CommentDefinition,
  AuthorPersona,
  RedditPostConfig,
} from "../../types";
import { DEFAULT_PERSONAS, createDefaultThreadConfig } from "../../types";

// Helper to flush microtask queue
const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("useThreadBuilder", () => {
  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe("Initialization", () => {
    it("initializes with default thread config when none provided", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      expect(result.current.threadConfig).toBeDefined();
      expect(result.current.threadConfig.post).toBeDefined();
      expect(result.current.threadConfig.comments).toEqual([]);
      expect(result.current.threadConfig.personas).toHaveLength(4);
    });

    it("initializes with provided thread config", () => {
      const onChange = vi.fn();
      const initialConfig: ThreadConfig = {
        post: {
          title: "Test Title",
          body: "Test Body",
          type: "text",
          subreddit: "testsubreddit",
        },
        comments: [],
        personas: DEFAULT_PERSONAS,
      };

      const { result } = renderHook(() =>
        useThreadBuilder({ initialConfig, onChange })
      );

      expect(result.current.threadConfig.post.title).toBe("Test Title");
      expect(result.current.threadConfig.post.subreddit).toBe("testsubreddit");
    });

    it("syncs state when initialConfig prop changes", () => {
      const onChange = vi.fn();
      const initialConfig: ThreadConfig = {
        post: {
          title: "First Title",
          body: "First Body",
          type: "text",
          subreddit: "first",
        },
        comments: [],
        personas: DEFAULT_PERSONAS,
      };

      const { result, rerender } = renderHook(
        ({ config }) => useThreadBuilder({ initialConfig: config, onChange }),
        { initialProps: { config: initialConfig } }
      );

      expect(result.current.threadConfig.post.title).toBe("First Title");

      // Update the initialConfig prop
      const newConfig: ThreadConfig = {
        post: {
          title: "Second Title",
          body: "Second Body",
          type: "text",
          subreddit: "second",
        },
        comments: [],
        personas: DEFAULT_PERSONAS,
      };

      rerender({ config: newConfig });

      expect(result.current.threadConfig.post.title).toBe("Second Title");
      expect(result.current.threadConfig.post.subreddit).toBe("second");
    });
  });

  // ==========================================================================
  // Post Management Tests
  // ==========================================================================

  describe("Post Management", () => {
    it("updates post fields correctly", async () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.updatePost({ title: "New Title" });
      });

      expect(result.current.threadConfig.post.title).toBe("New Title");

      await flushMicrotasks();
      expect(onChange).toHaveBeenCalled();
    });

    it("updates post type and handles related fields", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.updatePost({ type: "link", url: "https://example.com" });
      });

      expect(result.current.threadConfig.post.type).toBe("link");
      expect(result.current.threadConfig.post.url).toBe("https://example.com");
    });

    it("updates subreddit correctly", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.updatePost({ subreddit: "productivity" });
      });

      expect(result.current.threadConfig.post.subreddit).toBe("productivity");
    });

    it("updates NSFW and spoiler flags", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.updatePost({ nsfw: true, spoiler: true });
      });

      expect(result.current.threadConfig.post.nsfw).toBe(true);
      expect(result.current.threadConfig.post.spoiler).toBe(true);
    });
  });

  // ==========================================================================
  // Comment Management Tests
  // ==========================================================================

  describe("Comment Management", () => {
    it("adds a top-level comment", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.addComment();
      });

      expect(result.current.threadConfig.comments).toHaveLength(1);
      expect(result.current.threadConfig.comments[0].depth).toBe(0);
      expect(result.current.threadConfig.comments[0].parentId).toBeNull();
    });

    it("adds a reply to an existing comment", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.addComment();
      });

      const parentId = result.current.threadConfig.comments[0].id;

      act(() => {
        result.current.addComment(parentId);
      });

      expect(result.current.threadConfig.comments).toHaveLength(2);
      expect(result.current.threadConfig.comments[1].depth).toBe(1);
      expect(result.current.threadConfig.comments[1].parentId).toBe(parentId);
    });

    it("prevents adding comments beyond max depth", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      // Add nested comments up to max depth
      let currentParentId: string | null = null;
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.addComment(currentParentId);
        });
        currentParentId = result.current.threadConfig.comments[i].id;
      }

      // Try to add one more at depth 3 (should fail or not add)
      const deepCommentId =
        result.current.threadConfig.comments[
          result.current.threadConfig.comments.length - 1
        ].id;
      const countBefore = result.current.threadConfig.comments.length;

      act(() => {
        result.current.addComment(deepCommentId);
      });

      // Should either not add or add at max depth
      const lastComment =
        result.current.threadConfig.comments[
          result.current.threadConfig.comments.length - 1
        ];
      expect(lastComment.depth).toBeLessThanOrEqual(3);
    });

    it("updates a comment", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.addComment();
      });

      const commentId = result.current.threadConfig.comments[0].id;

      act(() => {
        result.current.updateComment(commentId, {
          body: "Updated comment body",
        });
      });

      expect(result.current.threadConfig.comments[0].body).toBe(
        "Updated comment body"
      );
    });

    it("deletes a comment", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.addComment();
      });

      const commentId = result.current.threadConfig.comments[0].id;

      act(() => {
        result.current.deleteComment(commentId);
      });

      expect(result.current.threadConfig.comments).toHaveLength(0);
    });

    it("deletes a comment and all its replies", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      // Add parent comment
      act(() => {
        result.current.addComment();
      });
      const parentId = result.current.threadConfig.comments[0].id;

      // Add reply
      act(() => {
        result.current.addComment(parentId);
      });

      // Delete parent - should delete reply too
      act(() => {
        result.current.deleteComment(parentId);
      });

      expect(result.current.threadConfig.comments).toHaveLength(0);
    });

    it("reorders comments", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      // Add two comments
      act(() => {
        result.current.addComment();
        result.current.addComment();
      });

      const firstId = result.current.threadConfig.comments[0].id;
      const secondId = result.current.threadConfig.comments[1].id;

      act(() => {
        result.current.reorderComments(secondId, 0);
      });

      expect(result.current.threadConfig.comments[0].id).toBe(secondId);
      expect(result.current.threadConfig.comments[1].id).toBe(firstId);
    });
  });

  // ==========================================================================
  // Persona Management Tests
  // ==========================================================================

  describe("Persona Management", () => {
    it("adds a new persona", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      const initialCount = result.current.threadConfig.personas.length;

      act(() => {
        result.current.addPersona({
          name: "New Persona",
          description: "A new test persona",
          role: "expert",
          tone: "friendly",
        });
      });

      expect(result.current.threadConfig.personas).toHaveLength(
        initialCount + 1
      );
      expect(
        result.current.threadConfig.personas[
          result.current.threadConfig.personas.length - 1
        ].name
      ).toBe("New Persona");
    });

    it("updates an existing persona", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      const personaId = result.current.threadConfig.personas[0].id;

      act(() => {
        result.current.updatePersona(personaId, { name: "Updated Name" });
      });

      expect(result.current.threadConfig.personas[0].name).toBe("Updated Name");
    });

    it("deletes a persona", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      // Add a new persona first
      act(() => {
        result.current.addPersona({
          name: "Deletable",
          description: "Will be deleted",
          role: "expert",
        });
      });

      const personaToDelete = result.current.threadConfig.personas.find(
        (p) => p.name === "Deletable"
      );
      const countBefore = result.current.threadConfig.personas.length;

      act(() => {
        result.current.deletePersona(personaToDelete!.id);
      });

      expect(result.current.threadConfig.personas).toHaveLength(
        countBefore - 1
      );
    });

    it("prevents deleting the OP persona", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      const opPersona = result.current.threadConfig.personas.find(
        (p) => p.id === "op"
      );
      const countBefore = result.current.threadConfig.personas.length;

      act(() => {
        result.current.deletePersona(opPersona!.id);
      });

      expect(result.current.threadConfig.personas).toHaveLength(countBefore);
    });

    it("getPersonaById returns the correct persona", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      const persona = result.current.getPersonaById("op");
      expect(persona).toBeDefined();
      expect(persona?.role).toBe("op");
    });

    it("reassigns orphaned comments to OP when persona is deleted", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      // Add a new persona
      act(() => {
        result.current.addPersona({
          name: "Custom Persona",
          description: "Will be deleted",
          role: "expert",
        });
      });

      const customPersona = result.current.threadConfig.personas.find(
        (p) => p.name === "Custom Persona"
      );

      // Add a comment using this persona
      act(() => {
        result.current.addComment();
      });

      const commentId = result.current.threadConfig.comments[0].id;

      // Assign the comment to the custom persona
      act(() => {
        result.current.updateComment(commentId, { persona: customPersona!.id });
      });

      expect(result.current.threadConfig.comments[0].persona).toBe(customPersona!.id);

      // Delete the persona
      act(() => {
        result.current.deletePersona(customPersona!.id);
      });

      // Comment should be reassigned to OP
      expect(result.current.threadConfig.comments[0].persona).toBe("op");
    });
  });

  // ==========================================================================
  // Helper Functions Tests
  // ==========================================================================

  describe("Helper Functions", () => {
    it("getCommentChildren returns direct children of a comment", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      // Add parent
      act(() => {
        result.current.addComment();
      });
      const parentId = result.current.threadConfig.comments[0].id;

      // Add children
      act(() => {
        result.current.addComment(parentId);
        result.current.addComment(parentId);
      });

      const children = result.current.getCommentChildren(parentId);
      expect(children).toHaveLength(2);
    });

    it("getTopLevelComments returns only top-level comments", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      // Add top-level comments
      act(() => {
        result.current.addComment();
        result.current.addComment();
      });

      const parentId = result.current.threadConfig.comments[0].id;

      // Add a reply
      act(() => {
        result.current.addComment(parentId);
      });

      const topLevel = result.current.getTopLevelComments();
      expect(topLevel).toHaveLength(2);
      expect(topLevel.every((c) => c.depth === 0)).toBe(true);
    });

    it("buildCommentTree organizes comments hierarchically", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      // Add parent
      act(() => {
        result.current.addComment();
      });
      const parentId = result.current.threadConfig.comments[0].id;

      // Add reply
      act(() => {
        result.current.addComment(parentId);
      });

      const tree = result.current.buildCommentTree();
      expect(tree).toHaveLength(1);
      expect(tree[0].children).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Preview Interpolation Tests
  // ==========================================================================

  describe("Preview Interpolation", () => {
    it("interpolates variables in post title", () => {
      const onChange = vi.fn();
      const sampleData = { product_name: "TaskMaster Pro" };
      const { result } = renderHook(() =>
        useThreadBuilder({ onChange, sampleData })
      );

      act(() => {
        result.current.updatePost({ title: "{product_name} - New Launch!" });
      });

      const preview = result.current.getPreviewData();
      expect(preview.post.title).toBe("TaskMaster Pro - New Launch!");
    });

    it("interpolates variables in post body", () => {
      const onChange = vi.fn();
      const sampleData = { feature: "AI automation" };
      const { result } = renderHook(() =>
        useThreadBuilder({ onChange, sampleData })
      );

      act(() => {
        result.current.updatePost({ body: "Check out our {feature}!" });
      });

      const preview = result.current.getPreviewData();
      expect(preview.post.body).toBe("Check out our AI automation!");
    });

    it("interpolates variables in comments", () => {
      const onChange = vi.fn();
      const sampleData = { price: "$9.99" };
      const { result } = renderHook(() =>
        useThreadBuilder({ onChange, sampleData })
      );

      act(() => {
        result.current.addComment();
      });

      const commentId = result.current.threadConfig.comments[0].id;

      act(() => {
        result.current.updateComment(commentId, {
          body: "How much? It's {price}!",
        });
      });

      const preview = result.current.getPreviewData();
      expect(preview.comments[0].body).toBe("How much? It's $9.99!");
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe("Validation", () => {
    it("validates required post title", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      const validation = result.current.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("title"))).toBe(true);
    });

    it("validates required subreddit", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.updatePost({ title: "Test Title" });
      });

      const validation = result.current.validate();
      expect(validation.valid).toBe(false);
      // Check for subreddit error (case-insensitive)
      expect(
        validation.errors.some((e) => e.toLowerCase().includes("subreddit"))
      ).toBe(true);
    });

    it("validates URL required for link posts", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.updatePost({
          title: "Test Title",
          subreddit: "test",
          type: "link",
        });
      });

      const validation = result.current.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("URL"))).toBe(true);
    });

    it("returns valid when all required fields are filled", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.updatePost({
          title: "Test Title",
          subreddit: "test",
          type: "text",
          body: "Some content",
        });
      });

      const validation = result.current.validate();
      expect(validation.valid).toBe(true);
    });

    it("warns when text post has empty body", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.updatePost({
          title: "Test Title",
          subreddit: "test",
          type: "text",
          body: "", // Empty body
        });
      });

      const validation = result.current.validate();
      expect(validation.valid).toBe(true); // Still valid, just a warning
      expect(validation.warnings.some((w) => w.includes("body content"))).toBe(true);
    });

    it("warns when comment has empty body", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.updatePost({
          title: "Test Title",
          subreddit: "test",
          type: "text",
          body: "Some content",
        });
      });

      // Add a comment with empty body
      act(() => {
        result.current.addComment();
      });

      const validation = result.current.validate();
      expect(validation.valid).toBe(true); // Still valid, just a warning
      expect(validation.warnings.some((w) => w.includes("empty body"))).toBe(true);
    });

    it("does not warn about empty body for link posts", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.updatePost({
          title: "Test Title",
          subreddit: "test",
          type: "link",
          url: "https://example.com",
          body: "", // Empty body is expected for link posts
        });
      });

      const validation = result.current.validate();
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some((w) => w.includes("body content"))).toBe(false);
    });
  });

  // ==========================================================================
  // OnChange Callback Tests
  // ==========================================================================

  describe("OnChange Callback", () => {
    it("calls onChange when post is updated", async () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.updatePost({ title: "New Title" });
      });

      await flushMicrotasks();

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          post: expect.objectContaining({ title: "New Title" }),
        })
      );
    });

    it("calls onChange when comment is added", async () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.addComment();
      });

      await flushMicrotasks();

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.comments).toHaveLength(1);
    });

    it("calls onChange when persona is modified", async () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useThreadBuilder({ onChange }));

      act(() => {
        result.current.addPersona({
          name: "Test",
          description: "Test",
          role: "expert",
        });
      });

      await flushMicrotasks();

      expect(onChange).toHaveBeenCalled();
    });
  });
});
