import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { KeywordsTable } from "../KeywordsTable";

describe("KeywordsTable", () => {
  let onDelete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onDelete = vi.fn();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders nothing when keywords array is empty", () => {
      const { container } = render(
        <KeywordsTable keywords={[]} onDelete={onDelete} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders table when keywords are provided", () => {
      render(
        <KeywordsTable
          keywords={["keyword1", "keyword2"]}
          onDelete={onDelete}
        />
      );

      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("displays all keywords in the table", () => {
      const keywords = ["buy shoes", "cheap sneakers", "best running shoes"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      expect(screen.getByText("buy shoes")).toBeInTheDocument();
      expect(screen.getByText("cheap sneakers")).toBeInTheDocument();
      expect(screen.getByText("best running shoes")).toBeInTheDocument();
    });

    it("displays row numbers starting from 1", () => {
      const keywords = ["first", "second", "third"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      const rows = screen.getAllByRole("row");
      // Skip header row (index 0)
      expect(within(rows[1]!).getByText("1")).toBeInTheDocument();
      expect(within(rows[2]!).getByText("2")).toBeInTheDocument();
      expect(within(rows[3]!).getByText("3")).toBeInTheDocument();
    });

    it("displays correct keyword count in header", () => {
      const keywords = ["one", "two", "three", "four", "five"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      expect(screen.getByText("5 keywords")).toBeInTheDocument();
    });

    it("displays singular 'keyword' for single item", () => {
      render(<KeywordsTable keywords={["single"]} onDelete={onDelete} />);

      expect(screen.getByText("1 keyword")).toBeInTheDocument();
    });

    it("displays custom header label when provided", () => {
      render(
        <KeywordsTable
          keywords={["test"]}
          onDelete={onDelete}
          headerLabel="Custom Label"
        />
      );

      expect(screen.getByText("Custom Label")).toBeInTheDocument();
    });

    it("displays default header label when not provided", () => {
      render(<KeywordsTable keywords={["test"]} onDelete={onDelete} />);

      expect(screen.getByText("Generated Keywords")).toBeInTheDocument();
    });

    it("renders table headers for index, keyword, and actions", () => {
      render(<KeywordsTable keywords={["test"]} onDelete={onDelete} />);

      expect(screen.getByText("#")).toBeInTheDocument();
      expect(screen.getByText("Keyword")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Delete Functionality Tests
  // ==========================================================================

  describe("Delete Functionality", () => {
    it("renders delete button for each keyword row", () => {
      const keywords = ["one", "two", "three"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      const deleteButtons = screen.getAllByRole("button", {
        name: /delete keyword/i,
      });
      expect(deleteButtons).toHaveLength(3);
    });

    it("calls onDelete with correct index when delete button is clicked", async () => {
      const user = userEvent.setup();
      const keywords = ["first", "second", "third"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      const deleteButtons = screen.getAllByRole("button", {
        name: /delete keyword/i,
      });

      await user.click(deleteButtons[1]!); // Click delete for "second"

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(1);
    });

    it("includes keyword in delete button aria-label", () => {
      const keywords = ["buy shoes online"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      expect(
        screen.getByRole("button", { name: "Delete keyword: buy shoes online" })
      ).toBeInTheDocument();
    });

    it("allows deleting first keyword", async () => {
      const user = userEvent.setup();
      const keywords = ["first", "second", "third"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      const deleteButtons = screen.getAllByRole("button", {
        name: /delete keyword/i,
      });

      await user.click(deleteButtons[0]!);

      expect(onDelete).toHaveBeenCalledWith(0);
    });

    it("allows deleting last keyword", async () => {
      const user = userEvent.setup();
      const keywords = ["first", "second", "third"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      const deleteButtons = screen.getAllByRole("button", {
        name: /delete keyword/i,
      });

      await user.click(deleteButtons[2]!);

      expect(onDelete).toHaveBeenCalledWith(2);
    });
  });

  // ==========================================================================
  // maxRows Truncation Tests
  // ==========================================================================

  describe("maxRows Truncation", () => {
    it("displays all keywords when maxRows is 0 (no limit)", () => {
      const keywords = Array.from({ length: 100 }, (_, i) => `keyword-${i + 1}`);

      render(
        <KeywordsTable keywords={keywords} onDelete={onDelete} maxRows={0} />
      );

      // All 100 keywords should be visible
      expect(screen.getByText("keyword-1")).toBeInTheDocument();
      expect(screen.getByText("keyword-100")).toBeInTheDocument();
      expect(screen.queryByText(/more keyword/)).not.toBeInTheDocument();
    });

    it("truncates to maxRows when specified", () => {
      const keywords = ["one", "two", "three", "four", "five"];

      render(
        <KeywordsTable keywords={keywords} onDelete={onDelete} maxRows={3} />
      );

      expect(screen.getByText("one")).toBeInTheDocument();
      expect(screen.getByText("two")).toBeInTheDocument();
      expect(screen.getByText("three")).toBeInTheDocument();
      expect(screen.queryByText("four")).not.toBeInTheDocument();
      expect(screen.queryByText("five")).not.toBeInTheDocument();
    });

    it("shows +N more keywords indicator when truncated", () => {
      const keywords = ["one", "two", "three", "four", "five"];

      render(
        <KeywordsTable keywords={keywords} onDelete={onDelete} maxRows={3} />
      );

      expect(screen.getByText("+2 more keywords")).toBeInTheDocument();
    });

    it("shows singular form for +1 more keyword", () => {
      const keywords = ["one", "two", "three", "four"];

      render(
        <KeywordsTable keywords={keywords} onDelete={onDelete} maxRows={3} />
      );

      expect(screen.getByText("+1 more keyword")).toBeInTheDocument();
    });

    it("still shows total count in header when truncated", () => {
      const keywords = ["one", "two", "three", "four", "five"];

      render(
        <KeywordsTable keywords={keywords} onDelete={onDelete} maxRows={2} />
      );

      // Header should show total count, not displayed count
      expect(screen.getByText("5 keywords")).toBeInTheDocument();
    });

    it("does not show more indicator when maxRows equals keywords length", () => {
      const keywords = ["one", "two", "three"];

      render(
        <KeywordsTable keywords={keywords} onDelete={onDelete} maxRows={3} />
      );

      expect(screen.queryByText(/more keyword/)).not.toBeInTheDocument();
    });

    it("does not show more indicator when maxRows exceeds keywords length", () => {
      const keywords = ["one", "two"];

      render(
        <KeywordsTable keywords={keywords} onDelete={onDelete} maxRows={10} />
      );

      expect(screen.queryByText(/more keyword/)).not.toBeInTheDocument();
    });

    it("delete button index corresponds to visible row index", async () => {
      const user = userEvent.setup();
      const keywords = ["one", "two", "three", "four", "five"];

      render(
        <KeywordsTable keywords={keywords} onDelete={onDelete} maxRows={3} />
      );

      const deleteButtons = screen.getAllByRole("button", {
        name: /delete keyword/i,
      });

      // Should only have 3 delete buttons for visible rows
      expect(deleteButtons).toHaveLength(3);

      // Delete "two" (index 1)
      await user.click(deleteButtons[1]!);
      expect(onDelete).toHaveBeenCalledWith(1);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles keywords with special characters", () => {
      const keywords = [
        "keyword with spaces",
        "keyword-with-dashes",
        "keyword_with_underscores",
        "keyword/with/slashes",
        "{variable_pattern}",
      ];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      keywords.forEach((keyword) => {
        expect(screen.getByText(keyword)).toBeInTheDocument();
      });
    });

    it("handles very long keywords", () => {
      const longKeyword =
        "this is a very long keyword that might cause layout issues if not handled properly with word breaking";

      render(
        <KeywordsTable keywords={[longKeyword]} onDelete={onDelete} />
      );

      expect(screen.getByText(longKeyword)).toBeInTheDocument();
    });

    it("handles duplicate keywords", () => {
      const keywords = ["duplicate", "duplicate", "unique"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      // Both duplicates should render (React handles key with index)
      const duplicates = screen.getAllByText("duplicate");
      expect(duplicates).toHaveLength(2);
    });

    it("handles empty string keyword", () => {
      const keywords = ["", "valid"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      // Empty string row should still be rendered
      const rows = screen.getAllByRole("row");
      // 1 header + 2 data rows
      expect(rows).toHaveLength(3);
    });

    it("handles large number of keywords", () => {
      const keywords = Array.from({ length: 1000 }, (_, i) => `keyword-${i}`);

      render(
        <KeywordsTable keywords={keywords} onDelete={onDelete} maxRows={50} />
      );

      expect(screen.getByText("1000 keywords")).toBeInTheDocument();
      expect(screen.getByText("+950 more keywords")).toBeInTheDocument();
    });

    it("handles keywords with HTML-like content", () => {
      const keywords = ["<script>alert('xss')</script>", "<b>bold</b>"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      // Should render as text, not as HTML
      expect(
        screen.getByText("<script>alert('xss')</script>")
      ).toBeInTheDocument();
      expect(screen.getByText("<b>bold</b>")).toBeInTheDocument();
    });

    it("handles unicode keywords", () => {
      const keywords = ["buy shoes", "comprar zapatos", "acheter chaussures"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      keywords.forEach((keyword) => {
        expect(screen.getByText(keyword)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has accessible table structure", () => {
      render(
        <KeywordsTable
          keywords={["test keyword"]}
          onDelete={onDelete}
        />
      );

      const table = screen.getByRole("table");
      expect(table).toBeInTheDocument();

      const columnHeaders = screen.getAllByRole("columnheader");
      expect(columnHeaders).toHaveLength(3);
    });

    it("delete buttons have descriptive aria-labels", () => {
      const keywords = ["buy shoes", "cheap sneakers"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      expect(
        screen.getByRole("button", { name: "Delete keyword: buy shoes" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Delete keyword: cheap sneakers" })
      ).toBeInTheDocument();
    });

    it("supports keyboard navigation to delete buttons", async () => {
      const user = userEvent.setup();
      const keywords = ["keyword1", "keyword2"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      // Tab to first delete button
      await user.tab();
      const firstDeleteButton = screen.getByRole("button", {
        name: "Delete keyword: keyword1",
      });
      expect(firstDeleteButton).toHaveFocus();

      // Tab to second delete button
      await user.tab();
      const secondDeleteButton = screen.getByRole("button", {
        name: "Delete keyword: keyword2",
      });
      expect(secondDeleteButton).toHaveFocus();
    });

    it("delete button can be activated with Enter key", async () => {
      const user = userEvent.setup();
      const keywords = ["keyword1"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      const deleteButton = screen.getByRole("button", {
        name: "Delete keyword: keyword1",
      });
      deleteButton.focus();

      await user.keyboard("{Enter}");

      expect(onDelete).toHaveBeenCalledWith(0);
    });

    it("delete button can be activated with Space key", async () => {
      const user = userEvent.setup();
      const keywords = ["keyword1"];

      render(<KeywordsTable keywords={keywords} onDelete={onDelete} />);

      const deleteButton = screen.getByRole("button", {
        name: "Delete keyword: keyword1",
      });
      deleteButton.focus();

      await user.keyboard(" ");

      expect(onDelete).toHaveBeenCalledWith(0);
    });
  });

  // ==========================================================================
  // Re-render Tests
  // ==========================================================================

  describe("Re-render Behavior", () => {
    it("updates when keywords change", () => {
      const { rerender } = render(
        <KeywordsTable keywords={["old1", "old2"]} onDelete={onDelete} />
      );

      expect(screen.getByText("old1")).toBeInTheDocument();
      expect(screen.getByText("old2")).toBeInTheDocument();

      rerender(
        <KeywordsTable keywords={["new1", "new2", "new3"]} onDelete={onDelete} />
      );

      expect(screen.queryByText("old1")).not.toBeInTheDocument();
      expect(screen.getByText("new1")).toBeInTheDocument();
      expect(screen.getByText("new2")).toBeInTheDocument();
      expect(screen.getByText("new3")).toBeInTheDocument();
      expect(screen.getByText("3 keywords")).toBeInTheDocument();
    });

    it("updates count when keywords are removed", () => {
      const { rerender } = render(
        <KeywordsTable
          keywords={["one", "two", "three"]}
          onDelete={onDelete}
        />
      );

      expect(screen.getByText("3 keywords")).toBeInTheDocument();

      rerender(
        <KeywordsTable keywords={["one", "two"]} onDelete={onDelete} />
      );

      expect(screen.getByText("2 keywords")).toBeInTheDocument();
    });

    it("updates maxRows truncation dynamically", () => {
      const keywords = ["one", "two", "three", "four", "five"];

      const { rerender } = render(
        <KeywordsTable keywords={keywords} onDelete={onDelete} maxRows={3} />
      );

      expect(screen.getByText("+2 more keywords")).toBeInTheDocument();

      rerender(
        <KeywordsTable keywords={keywords} onDelete={onDelete} maxRows={5} />
      );

      expect(screen.queryByText(/more keyword/)).not.toBeInTheDocument();
    });

    it("updates header label when changed", () => {
      const { rerender } = render(
        <KeywordsTable
          keywords={["test"]}
          onDelete={onDelete}
          headerLabel="Label 1"
        />
      );

      expect(screen.getByText("Label 1")).toBeInTheDocument();

      rerender(
        <KeywordsTable
          keywords={["test"]}
          onDelete={onDelete}
          headerLabel="Label 2"
        />
      );

      expect(screen.queryByText("Label 1")).not.toBeInTheDocument();
      expect(screen.getByText("Label 2")).toBeInTheDocument();
    });
  });
});
