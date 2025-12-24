import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ThreadBuilder } from "../ThreadBuilder";
import type { ThreadConfig } from "../../../types";
import { DEFAULT_PERSONAS, createDefaultThreadConfig } from "../../../types";

const mockConfig: ThreadConfig = {
  post: {
    title: "Test Post",
    body: "Test body",
    type: "text",
    subreddit: "test",
  },
  comments: [],
  personas: DEFAULT_PERSONAS,
};

describe("ThreadBuilder", () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders post editor section", () => {
      render(<ThreadBuilder config={mockConfig} onChange={vi.fn()} />);

      expect(screen.getByTestId("post-editor")).toBeInTheDocument();
    });

    it("renders comment tree section", () => {
      render(<ThreadBuilder config={mockConfig} onChange={vi.fn()} />);

      // Use heading role to find the Comments section header
      expect(screen.getByRole("heading", { name: /comments/i })).toBeInTheDocument();
    });

    it("renders persona manager section", () => {
      render(<ThreadBuilder config={mockConfig} onChange={vi.fn()} />);

      expect(screen.getByText(/personas/i)).toBeInTheDocument();
    });

    it("renders preview section", () => {
      render(<ThreadBuilder config={mockConfig} onChange={vi.fn()} />);

      expect(screen.getByTestId("thread-preview")).toBeInTheDocument();
    });

    it("renders add comment button", () => {
      render(<ThreadBuilder config={mockConfig} onChange={vi.fn()} />);

      expect(
        screen.getByRole("button", { name: /add comment/i })
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe("Integration", () => {
    it("calls onChange when post is updated", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<ThreadBuilder config={mockConfig} onChange={onChange} />);

      await user.clear(screen.getByLabelText(/title/i));
      await user.type(screen.getByLabelText(/title/i), "New Title");

      expect(onChange).toHaveBeenCalled();
    });

    it("calls onChange when comment is added", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<ThreadBuilder config={mockConfig} onChange={onChange} />);

      await user.click(screen.getByRole("button", { name: /add comment/i }));

      expect(onChange).toHaveBeenCalled();
    });

    it("calls onChange when persona is added", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<ThreadBuilder config={mockConfig} onChange={onChange} />);

      await user.click(screen.getByRole("button", { name: /add persona/i }));
      await user.type(screen.getByLabelText(/name/i), "New Persona");
      await user.click(
        screen.getByRole("button", { name: /create persona/i })
      );

      expect(onChange).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Preview Update Tests
  // ==========================================================================

  describe("Preview Updates", () => {
    it("updates preview when post title changes", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn((newConfig: ThreadConfig) => newConfig);

      const { rerender } = render(
        <ThreadBuilder config={mockConfig} onChange={onChange} />
      );

      // Type a new title
      await user.clear(screen.getByLabelText(/title/i));
      await user.type(screen.getByLabelText(/title/i), "Updated Title");

      // Get the last call to onChange
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      const updatedConfig = lastCall[0] as ThreadConfig;

      // Re-render with updated config
      rerender(<ThreadBuilder config={updatedConfig} onChange={onChange} />);

      // Preview should show the new title
      expect(screen.getByText("Updated Title")).toBeInTheDocument();
    });

    it("shows interpolated variables in preview with sample data", () => {
      const configWithVars: ThreadConfig = {
        ...mockConfig,
        post: {
          ...mockConfig.post,
          title: "{product_name} Review",
        },
      };

      render(
        <ThreadBuilder
          config={configWithVars}
          onChange={vi.fn()}
          sampleData={{ product_name: "TaskMaster Pro" }}
        />
      );

      expect(screen.getByText("TaskMaster Pro Review")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Layout Tests
  // ==========================================================================

  describe("Layout", () => {
    it("has a two-column layout for editor and preview", () => {
      render(<ThreadBuilder config={mockConfig} onChange={vi.fn()} />);

      const container = screen.getByTestId("thread-builder");
      expect(container).toHaveClass(/_builder/);
    });
  });
});
