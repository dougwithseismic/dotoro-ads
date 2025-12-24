import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PostEditor } from "../PostEditor";
import type { RedditPostConfig } from "../../../types";

const mockPost: RedditPostConfig = {
  title: "Test Post Title",
  body: "Test post body content",
  type: "text",
  subreddit: "testsubreddit",
  nsfw: false,
  spoiler: false,
  sendReplies: true,
};

describe("PostEditor", () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders title input", () => {
      render(<PostEditor post={mockPost} onChange={vi.fn()} />);

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    it("renders body textarea", () => {
      render(<PostEditor post={mockPost} onChange={vi.fn()} />);

      expect(screen.getByLabelText(/body/i)).toBeInTheDocument();
    });

    it("renders subreddit input", () => {
      render(<PostEditor post={mockPost} onChange={vi.fn()} />);

      expect(screen.getByLabelText(/subreddit/i)).toBeInTheDocument();
    });

    it("renders post type selector", () => {
      render(<PostEditor post={mockPost} onChange={vi.fn()} />);

      expect(screen.getByLabelText(/post type/i)).toBeInTheDocument();
    });

    it("displays current post values", () => {
      render(<PostEditor post={mockPost} onChange={vi.fn()} />);

      expect(screen.getByLabelText(/title/i)).toHaveValue("Test Post Title");
      expect(screen.getByLabelText(/body/i)).toHaveValue("Test post body content");
      expect(screen.getByLabelText(/subreddit/i)).toHaveValue("testsubreddit");
    });

    it("renders NSFW toggle", () => {
      render(<PostEditor post={mockPost} onChange={vi.fn()} />);

      expect(screen.getByLabelText(/nsfw/i)).toBeInTheDocument();
    });

    it("renders spoiler toggle", () => {
      render(<PostEditor post={mockPost} onChange={vi.fn()} />);

      expect(screen.getByLabelText(/spoiler/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Interaction Tests
  // ==========================================================================

  describe("Interactions", () => {
    it("calls onChange when title is updated", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<PostEditor post={mockPost} onChange={onChange} />);

      await user.clear(screen.getByLabelText(/title/i));
      await user.type(screen.getByLabelText(/title/i), "New Title");

      expect(onChange).toHaveBeenCalled();
    });

    it("calls onChange when body is updated", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<PostEditor post={mockPost} onChange={onChange} />);

      await user.clear(screen.getByLabelText(/body/i));
      await user.type(screen.getByLabelText(/body/i), "New body");

      expect(onChange).toHaveBeenCalled();
    });

    it("calls onChange when subreddit is updated", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<PostEditor post={mockPost} onChange={onChange} />);

      await user.clear(screen.getByLabelText(/subreddit/i));
      await user.type(screen.getByLabelText(/subreddit/i), "newsubreddit");

      expect(onChange).toHaveBeenCalled();
    });

    it("calls onChange when post type is changed", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<PostEditor post={mockPost} onChange={onChange} />);

      await user.selectOptions(screen.getByLabelText(/post type/i), "link");

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: "link" })
      );
    });

    it("calls onChange when NSFW is toggled", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<PostEditor post={mockPost} onChange={onChange} />);

      await user.click(screen.getByLabelText(/nsfw/i));

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ nsfw: true })
      );
    });

    it("calls onChange when spoiler is toggled", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<PostEditor post={mockPost} onChange={onChange} />);

      await user.click(screen.getByLabelText(/spoiler/i));

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ spoiler: true })
      );
    });
  });

  // ==========================================================================
  // Link Post Tests
  // ==========================================================================

  describe("Link Post Type", () => {
    it("shows URL input when post type is link", () => {
      const linkPost: RedditPostConfig = {
        ...mockPost,
        type: "link",
        url: "https://example.com",
      };

      render(<PostEditor post={linkPost} onChange={vi.fn()} />);

      expect(screen.getByLabelText(/url/i)).toBeInTheDocument();
    });

    it("hides URL input when post type is text", () => {
      render(<PostEditor post={mockPost} onChange={vi.fn()} />);

      expect(screen.queryByLabelText(/url/i)).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Variable Support Tests
  // ==========================================================================

  describe("Variable Support", () => {
    it("shows variable hint text", () => {
      render(<PostEditor post={mockPost} onChange={vi.fn()} />);

      expect(screen.getByText(/\{variable\}/i)).toBeInTheDocument();
    });

    it("accepts variable patterns in title", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<PostEditor post={mockPost} onChange={onChange} />);

      await user.clear(screen.getByLabelText(/title/i));
      await user.type(screen.getByLabelText(/title/i), "{{product_name}} Review");

      expect(onChange).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has proper form labels", () => {
      render(<PostEditor post={mockPost} onChange={vi.fn()} />);

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/body/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/subreddit/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/post type/i)).toBeInTheDocument();
    });

    it("has required field indicators", () => {
      render(<PostEditor post={mockPost} onChange={vi.fn()} />);

      // Title and subreddit are required
      const titleLabel = screen.getByText(/title/i).closest("label");
      const subredditLabel = screen.getByText(/subreddit/i).closest("label");

      expect(titleLabel).toHaveTextContent("*");
      expect(subredditLabel).toHaveTextContent("*");
    });
  });
});
