import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ThreadPreview } from "../ThreadPreview";
import type { ThreadConfig, CommentDefinition, AuthorPersona, RedditPostConfig } from "../../../types";
import { DEFAULT_PERSONAS } from "../../../types";

const mockPost: RedditPostConfig = {
  title: "Test Post Title",
  body: "This is the post body content.",
  type: "text",
  subreddit: "testsubreddit",
  nsfw: false,
  spoiler: false,
};

const mockComments: CommentDefinition[] = [
  {
    id: "c1",
    parentId: null,
    persona: "curious",
    body: "This is a curious comment",
    depth: 0,
    sortOrder: 0,
  },
  {
    id: "c2",
    parentId: "c1",
    persona: "op",
    body: "OP responding to curious",
    depth: 1,
    sortOrder: 1,
  },
];

const mockPersonas: AuthorPersona[] = DEFAULT_PERSONAS;

const mockConfig: ThreadConfig = {
  post: mockPost,
  comments: mockComments,
  personas: mockPersonas,
};

describe("ThreadPreview", () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders the post title", () => {
      render(<ThreadPreview config={mockConfig} />);

      expect(screen.getByText("Test Post Title")).toBeInTheDocument();
    });

    it("renders the post body", () => {
      render(<ThreadPreview config={mockConfig} />);

      expect(
        screen.getByText("This is the post body content.")
      ).toBeInTheDocument();
    });

    it("renders the subreddit", () => {
      render(<ThreadPreview config={mockConfig} />);

      expect(screen.getByText(/r\/testsubreddit/)).toBeInTheDocument();
    });

    it("renders comments", () => {
      render(<ThreadPreview config={mockConfig} />);

      expect(
        screen.getByText("This is a curious comment")
      ).toBeInTheDocument();
      expect(
        screen.getByText("OP responding to curious")
      ).toBeInTheDocument();
    });

    it("renders persona names with comments", () => {
      render(<ThreadPreview config={mockConfig} />);

      expect(screen.getByText("Curious User")).toBeInTheDocument();
      expect(screen.getByText("Original Poster")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Variable Interpolation Tests
  // ==========================================================================

  describe("Variable Interpolation", () => {
    it("interpolates variables in post title", () => {
      const configWithVars: ThreadConfig = {
        ...mockConfig,
        post: {
          ...mockPost,
          title: "{product_name} Review",
        },
      };

      render(
        <ThreadPreview
          config={configWithVars}
          sampleData={{ product_name: "TaskMaster Pro" }}
        />
      );

      expect(screen.getByText("TaskMaster Pro Review")).toBeInTheDocument();
    });

    it("interpolates variables in post body", () => {
      const configWithVars: ThreadConfig = {
        ...mockConfig,
        post: {
          ...mockPost,
          body: "Check out {feature}!",
        },
      };

      render(
        <ThreadPreview
          config={configWithVars}
          sampleData={{ feature: "AI automation" }}
        />
      );

      expect(screen.getByText("Check out AI automation!")).toBeInTheDocument();
    });

    it("interpolates variables in comments", () => {
      const configWithVars: ThreadConfig = {
        ...mockConfig,
        comments: [
          {
            ...mockComments[0],
            body: "How much is {price}?",
          },
        ],
      };

      render(
        <ThreadPreview
          config={configWithVars}
          sampleData={{ price: "$9.99" }}
        />
      );

      expect(screen.getByText("How much is $9.99?")).toBeInTheDocument();
    });

    it("shows variable placeholder when no sample data", () => {
      const configWithVars: ThreadConfig = {
        ...mockConfig,
        post: {
          ...mockPost,
          title: "{product_name} Review",
        },
      };

      render(<ThreadPreview config={configWithVars} />);

      expect(screen.getByText("{product_name} Review")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Reddit Styling Tests
  // ==========================================================================

  describe("Reddit Styling", () => {
    it("applies Reddit-like styling to preview", () => {
      render(<ThreadPreview config={mockConfig} />);

      const preview = screen.getByTestId("thread-preview");
      expect(preview).toHaveClass(/_preview/);
    });

    it("shows nested comments with indentation", () => {
      render(<ThreadPreview config={mockConfig} />);

      const replyComment = screen.getByTestId("preview-comment-c2");
      expect(replyComment).toHaveAttribute("data-depth", "1");
    });

    it("shows NSFW badge when enabled", () => {
      const nsfwConfig: ThreadConfig = {
        ...mockConfig,
        post: {
          ...mockPost,
          nsfw: true,
        },
      };

      render(<ThreadPreview config={nsfwConfig} />);

      expect(screen.getByText("NSFW")).toBeInTheDocument();
    });

    it("shows Spoiler badge when enabled", () => {
      const spoilerConfig: ThreadConfig = {
        ...mockConfig,
        post: {
          ...mockPost,
          spoiler: true,
        },
      };

      render(<ThreadPreview config={spoilerConfig} />);

      expect(screen.getByText("Spoiler")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Empty State Tests
  // ==========================================================================

  describe("Empty States", () => {
    it("shows placeholder for empty post title", () => {
      const emptyConfig: ThreadConfig = {
        ...mockConfig,
        post: {
          ...mockPost,
          title: "",
        },
      };

      render(<ThreadPreview config={emptyConfig} />);

      expect(screen.getByText(/enter a title/i)).toBeInTheDocument();
    });

    it("shows placeholder for empty post body", () => {
      const emptyConfig: ThreadConfig = {
        ...mockConfig,
        post: {
          ...mockPost,
          body: "",
        },
      };

      render(<ThreadPreview config={emptyConfig} />);

      expect(screen.getByText(/no content/i)).toBeInTheDocument();
    });
  });
});
