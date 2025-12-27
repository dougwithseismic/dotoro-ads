import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { KeywordCombinator } from "../KeywordCombinator";

describe("KeywordCombinator", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders three textarea columns for prefixes, core terms, and suffixes", () => {
      render(<KeywordCombinator onChange={onChange} />);

      expect(screen.getByLabelText(/prefixes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/core terms/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/suffixes/i)).toBeInTheDocument();
    });

    it("displays placeholder text in textareas", () => {
      render(<KeywordCombinator onChange={onChange} />);

      const prefixArea = screen.getByLabelText(/prefixes/i);
      const coreArea = screen.getByLabelText(/core terms/i);
      const suffixArea = screen.getByLabelText(/suffixes/i);

      expect(prefixArea).toHaveAttribute("placeholder");
      expect(coreArea).toHaveAttribute("placeholder");
      expect(suffixArea).toHaveAttribute("placeholder");
    });

    it("renders combination type checkboxes", () => {
      render(<KeywordCombinator onChange={onChange} />);

      expect(screen.getByLabelText(/core only/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/prefix \+ core/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/core \+ suffix/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/full combination/i)).toBeInTheDocument();
    });

    it("renders hint text for each column", () => {
      render(<KeywordCombinator onChange={onChange} />);

      expect(screen.getByText(/action words or modifiers/i)).toBeInTheDocument();
      expect(screen.getByText(/main keywords/i)).toBeInTheDocument();
      expect(screen.getByText(/qualifiers or location/i)).toBeInTheDocument();
    });

    it("shows empty hint when no core terms entered", () => {
      render(<KeywordCombinator onChange={onChange} />);

      expect(
        screen.getByText(/enter at least one core term/i)
      ).toBeInTheDocument();
    });

    it("shows 0 keywords when nothing entered", () => {
      render(<KeywordCombinator onChange={onChange} />);

      expect(screen.getByText("0 keywords")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Keyword Generation Tests
  // ==========================================================================

  describe("Keyword Generation", () => {
    it("generates core-only keywords by default", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "shoes\nsneakers");

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.arrayContaining(["shoes", "sneakers"])
        );
      });
    });

    it("generates prefix + core combinations", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} />);

      const prefixArea = screen.getByLabelText(/prefixes/i);
      const coreArea = screen.getByLabelText(/core terms/i);

      await user.type(prefixArea, "buy");
      await user.type(coreArea, "shoes");

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.arrayContaining(["shoes", "buy shoes"])
        );
      });
    });

    it("generates core + suffix combinations", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      const suffixArea = screen.getByLabelText(/suffixes/i);

      await user.type(coreArea, "shoes");
      await user.type(suffixArea, "online");

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.arrayContaining(["shoes", "shoes online"])
        );
      });
    });

    it("generates full combinations (prefix + core + suffix)", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} />);

      const prefixArea = screen.getByLabelText(/prefixes/i);
      const coreArea = screen.getByLabelText(/core terms/i);
      const suffixArea = screen.getByLabelText(/suffixes/i);

      await user.type(prefixArea, "buy");
      await user.type(coreArea, "shoes");
      await user.type(suffixArea, "online");

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            "shoes", // core only
            "buy shoes", // prefix + core
            "shoes online", // core + suffix
            "buy shoes online", // full
          ])
        );
      });
    });

    it("generates combinations for multiple terms", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} />);

      const prefixArea = screen.getByLabelText(/prefixes/i);
      const coreArea = screen.getByLabelText(/core terms/i);

      await user.type(prefixArea, "buy\ncheap");
      await user.type(coreArea, "shoes\nsneakers");

      await waitFor(() => {
        // Should have multiple combinations
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
        const keywords = lastCall?.[0] as string[];
        expect(keywords).toContain("shoes");
        expect(keywords).toContain("sneakers");
        expect(keywords).toContain("buy shoes");
        expect(keywords).toContain("cheap shoes");
        expect(keywords).toContain("buy sneakers");
        expect(keywords).toContain("cheap sneakers");
      });
    });

    it("updates keyword count display", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "shoes\nsneakers\nboots");

      await waitFor(() => {
        // Both formula section and table header show keyword count
        const countElements = screen.getAllByText("3 keywords");
        expect(countElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("removes duplicates from generated keywords", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      // Entering same term twice should not produce duplicates
      await user.type(coreArea, "shoes\nshoes");

      await waitFor(() => {
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
        const keywords = lastCall?.[0] as string[];
        const shoesCount = keywords.filter((k) => k === "shoes").length;
        expect(shoesCount).toBe(1);
      });
    });

    it("trims whitespace from terms", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "  shoes  ");

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.arrayContaining(["shoes"])
        );
      });
    });

    it("ignores empty lines", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "shoes\n\n\nsneakers");

      await waitFor(() => {
        // Both formula section and table header show keyword count
        const countElements = screen.getAllByText("2 keywords");
        expect(countElements.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ==========================================================================
  // Combination Type Toggle Tests
  // ==========================================================================

  describe("Combination Type Toggles", () => {
    it("all combination types are enabled by default", () => {
      render(<KeywordCombinator onChange={onChange} />);

      expect(screen.getByLabelText(/core only/i)).toBeChecked();
      expect(screen.getByLabelText(/prefix \+ core/i)).toBeChecked();
      expect(screen.getByLabelText(/core \+ suffix/i)).toBeChecked();
      expect(screen.getByLabelText(/full combination/i)).toBeChecked();
    });

    it("disabling core-only removes core-only keywords", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "shoes");

      // Disable core-only
      const coreOnlyCheckbox = screen.getByLabelText(/core only/i);
      await user.click(coreOnlyCheckbox);

      await waitFor(() => {
        // Should not include bare "shoes" anymore
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
        const keywords = lastCall?.[0] as string[];
        expect(keywords).toEqual([]);
      });
    });

    it("prefix + core is disabled when no prefixes exist", () => {
      render(<KeywordCombinator onChange={onChange} />);

      // Initially disabled because no prefixes - the checkbox should be disabled
      const prefixCoreCheckbox = screen.getByLabelText(/prefix \+ core/i);
      expect(prefixCoreCheckbox).toBeDisabled();
    });

    it("core + suffix is disabled when no suffixes exist", () => {
      render(<KeywordCombinator onChange={onChange} />);

      const coreSuffixCheckbox = screen.getByLabelText(/core \+ suffix/i);
      expect(coreSuffixCheckbox).toBeDisabled();
    });

    it("full combination is disabled when no prefixes or suffixes", () => {
      render(<KeywordCombinator onChange={onChange} />);

      const fullCheckbox = screen.getByLabelText(/full combination/i);
      expect(fullCheckbox).toBeDisabled();
    });

    it("enables prefix + core when prefixes are added", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} />);

      const prefixArea = screen.getByLabelText(/prefixes/i);
      await user.type(prefixArea, "buy");

      await waitFor(() => {
        const prefixCoreLabel = screen.getByText(/prefix \+ core/i)
          .closest("label");
        expect(prefixCoreLabel).not.toHaveClass("combinationTypeDisabled");
      });
    });

    it("toggling combination type updates generated keywords", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} />);

      const prefixArea = screen.getByLabelText(/prefixes/i);
      const coreArea = screen.getByLabelText(/core terms/i);

      await user.type(prefixArea, "buy");
      await user.type(coreArea, "shoes");

      // Should have both core-only and prefix+core
      await waitFor(() => {
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
        const keywords = lastCall?.[0] as string[];
        expect(keywords).toContain("shoes");
        expect(keywords).toContain("buy shoes");
      });

      // Disable prefix + core
      const prefixCoreCheckbox = screen.getByLabelText(/prefix \+ core/i);
      await user.click(prefixCoreCheckbox);

      await waitFor(() => {
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
        const keywords = lastCall?.[0] as string[];
        expect(keywords).toContain("shoes");
        expect(keywords).not.toContain("buy shoes");
      });
    });
  });

  // ==========================================================================
  // Table Display Tests
  // ==========================================================================

  describe("Table Display", () => {
    it("displays keywords in table format", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} showPreview={true} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "shoes\nsneakers");

      await waitFor(() => {
        expect(screen.getByRole("table")).toBeInTheDocument();
      });
    });

    it("shows KeywordsTable component with generated keywords", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} showPreview={true} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "tablekeyword");

      await waitFor(() => {
        // Look for keyword in table cell specifically
        const table = screen.getByRole("table");
        expect(within(table).getByText("tablekeyword")).toBeInTheDocument();
        expect(screen.getByText("Generated Keywords")).toBeInTheDocument();
      });
    });

    it("hides table when showPreview is false", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} showPreview={false} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "shoes");

      await waitFor(() => {
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
      });
    });

    it("respects maxTableRows prop", async () => {
      const user = userEvent.setup();

      render(
        <KeywordCombinator
          onChange={onChange}
          showPreview={true}
          maxTableRows={2}
        />
      );

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "one\ntwo\nthree\nfour\nfive");

      await waitFor(() => {
        // Should show truncation indicator
        expect(screen.getByText(/\+\d+ more keyword/)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Keyword Deletion Tests
  // ==========================================================================

  describe("Keyword Deletion", () => {
    it("removes keyword when delete button is clicked", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} showPreview={true} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "shoes\nsneakers");

      await waitFor(() => {
        expect(screen.getByText("shoes")).toBeInTheDocument();
        expect(screen.getByText("sneakers")).toBeInTheDocument();
      });

      // Delete "shoes"
      const deleteButton = screen.getByRole("button", {
        name: /delete keyword: shoes/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText("shoes")).not.toBeInTheDocument();
        expect(screen.getByText("sneakers")).toBeInTheDocument();
      });
    });

    it("tracks excluded keywords", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} showPreview={true} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "alpha\nbeta\ngamma");

      await waitFor(() => {
        // Both formula section and table header show keyword count
        const countElements = screen.getAllByText("3 keywords");
        expect(countElements.length).toBeGreaterThanOrEqual(1);
      });

      // Delete "beta"
      const deleteButton = screen.getByRole("button", {
        name: /delete keyword: beta/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        // Count should decrease - check for 2 keywords in any location
        const countElements = screen.getAllByText("2 keywords");
        expect(countElements.length).toBeGreaterThanOrEqual(1);
        // Should show removed count
        expect(screen.getByText("(1 removed)")).toBeInTheDocument();
      });
    });

    it("calls onChange with excluded keywords removed", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} showPreview={true} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "shoes\nsneakers");

      // Clear previous calls
      onChange.mockClear();

      await waitFor(() => {
        expect(screen.getByText("shoes")).toBeInTheDocument();
      });

      // Delete "shoes"
      const deleteButton = screen.getByRole("button", {
        name: /delete keyword: shoes/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(["sneakers"]);
      });
    });

    it("shows excluded count in formula section", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} showPreview={true} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "one\ntwo\nthree");

      await waitFor(() => {
        expect(screen.getByText("one")).toBeInTheDocument();
      });

      // Delete two keywords
      await user.click(
        screen.getByRole("button", { name: /delete keyword: one/i })
      );
      await user.click(
        screen.getByRole("button", { name: /delete keyword: two/i })
      );

      await waitFor(() => {
        expect(screen.getByText("(2 removed)")).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Restore Functionality Tests
  // ==========================================================================

  describe("Restore Functionality", () => {
    it("shows restore button when keywords are excluded", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} showPreview={true} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "shoes\nsneakers");

      await waitFor(() => {
        expect(screen.getByText("shoes")).toBeInTheDocument();
      });

      // Delete a keyword
      await user.click(
        screen.getByRole("button", { name: /delete keyword: shoes/i })
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /restore all/i })).toBeInTheDocument();
      });
    });

    it("hides restore button when no keywords are excluded", () => {
      render(<KeywordCombinator onChange={onChange} showPreview={true} />);

      expect(
        screen.queryByRole("button", { name: /restore all/i })
      ).not.toBeInTheDocument();
    });

    it("restores all excluded keywords when restore button clicked", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} showPreview={true} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "shoes\nsneakers");

      await waitFor(() => {
        expect(screen.getByText("shoes")).toBeInTheDocument();
      });

      // Delete both keywords
      await user.click(
        screen.getByRole("button", { name: /delete keyword: shoes/i })
      );
      await user.click(
        screen.getByRole("button", { name: /delete keyword: sneakers/i })
      );

      await waitFor(() => {
        expect(screen.getByText("(2 removed)")).toBeInTheDocument();
      });

      // Restore all
      await user.click(screen.getByRole("button", { name: /restore all/i }));

      await waitFor(() => {
        expect(screen.getByText("shoes")).toBeInTheDocument();
        expect(screen.getByText("sneakers")).toBeInTheDocument();
        expect(screen.queryByText(/removed/)).not.toBeInTheDocument();
      });
    });

    it("clears excluded count after restore", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} showPreview={true} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "restoreitem");

      await waitFor(() => {
        // Look in the table for the keyword
        const table = screen.getByRole("table");
        expect(within(table).getByText("restoreitem")).toBeInTheDocument();
      });

      // Delete keyword
      await user.click(
        screen.getByRole("button", { name: /delete keyword: restoreitem/i })
      );

      await waitFor(() => {
        expect(screen.getByText("(1 removed)")).toBeInTheDocument();
      });

      // Restore
      await user.click(screen.getByRole("button", { name: /restore all/i }));

      await waitFor(() => {
        // Check that keyword count is shown (both formula and table header show 1 keyword)
        const countElements = screen.getAllByText("1 keyword");
        expect(countElements.length).toBeGreaterThanOrEqual(1);
        expect(
          screen.queryByRole("button", { name: /restore all/i })
        ).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Variable Interpolation Tests
  // ==========================================================================

  describe("Variable Interpolation", () => {
    it("interpolates variables in preview when sampleRow provided", async () => {
      const user = userEvent.setup();
      const sampleRow = { product: "Nike Air Max", brand: "Nike" };

      render(
        <KeywordCombinator
          onChange={onChange}
          showPreview={true}
          sampleRow={sampleRow}
        />
      );

      const coreArea = screen.getByLabelText(/core terms/i);
      // Use paste instead of type for content with curly braces
      await user.clear(coreArea);
      await user.click(coreArea);
      await user.paste("{product}");

      await waitFor(() => {
        expect(screen.getByText("Nike Air Max")).toBeInTheDocument();
      });
    });

    it("shows raw pattern when variable not found", async () => {
      const user = userEvent.setup();
      const sampleRow = { other_column: "value" };

      render(
        <KeywordCombinator
          onChange={onChange}
          showPreview={true}
          sampleRow={sampleRow}
        />
      );

      const coreArea = screen.getByLabelText(/core terms/i);
      // Use paste instead of type for content with curly braces
      await user.clear(coreArea);
      await user.click(coreArea);
      await user.paste("{unknown_variable}");

      await waitFor(() => {
        // Should show the uninterpolated pattern in the table
        const table = screen.getByRole("table");
        expect(within(table).getByText("{unknown_variable}")).toBeInTheDocument();
      });
    });

    it("interpolates multiple variables", async () => {
      const user = userEvent.setup();
      const sampleRow = { brand: "Nike", model: "Air Max 90" };

      render(
        <KeywordCombinator
          onChange={onChange}
          showPreview={true}
          sampleRow={sampleRow}
        />
      );

      const coreArea = screen.getByLabelText(/core terms/i);
      // Use paste instead of type for content with curly braces
      await user.clear(coreArea);
      await user.click(coreArea);
      await user.paste("{brand} {model}");

      await waitFor(() => {
        expect(screen.getByText("Nike Air Max 90")).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Initial Keywords Tests
  // ==========================================================================

  describe("Initial Keywords", () => {
    it("populates core terms from existing keywords", () => {
      render(
        <KeywordCombinator
          keywords={["shoes", "sneakers"]}
          onChange={onChange}
        />
      );

      const coreArea = screen.getByLabelText(/core terms/i) as HTMLTextAreaElement;
      expect(coreArea.value).toContain("shoes");
      expect(coreArea.value).toContain("sneakers");
    });

    it("handles empty keywords array", () => {
      render(<KeywordCombinator keywords={[]} onChange={onChange} />);

      const coreArea = screen.getByLabelText(/core terms/i) as HTMLTextAreaElement;
      expect(coreArea.value).toBe("");
    });
  });

  // ==========================================================================
  // Term Count Display Tests
  // ==========================================================================

  describe("Term Count Display", () => {
    it("shows term count for each column when terms exist", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} />);

      const prefixArea = screen.getByLabelText(/prefixes/i);
      const coreArea = screen.getByLabelText(/core terms/i);
      const suffixArea = screen.getByLabelText(/suffixes/i);

      await user.type(prefixArea, "buy\ncheap\nbest");
      await user.type(coreArea, "shoes\nsneakers");
      await user.type(suffixArea, "online");

      await waitFor(() => {
        expect(screen.getByText("3 terms")).toBeInTheDocument();
        expect(screen.getByText("2 terms")).toBeInTheDocument();
        expect(screen.getByText("1 term")).toBeInTheDocument();
      });
    });

    it("hides term count when column is empty", () => {
      render(<KeywordCombinator onChange={onChange} />);

      // Initially all columns are empty, so no term counts
      expect(screen.queryByText(/\d+ terms/)).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles rapid input without errors", async () => {
      const user = userEvent.setup({ delay: null });

      render(<KeywordCombinator onChange={onChange} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "rapid typing test 1 2 3 4 5\nnew line\nanother");

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
      });
    });

    it("handles special characters in keywords", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} showPreview={true} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "shoes & boots\n50% off sale");

      await waitFor(() => {
        expect(screen.getByText("shoes & boots")).toBeInTheDocument();
        expect(screen.getByText("50% off sale")).toBeInTheDocument();
      });
    });

    it("handles unicode characters", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} showPreview={true} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "zapatillas\nchaussures");

      await waitFor(() => {
        expect(screen.getByText("zapatillas")).toBeInTheDocument();
        expect(screen.getByText("chaussures")).toBeInTheDocument();
      });
    });

    it("preserves exclusions when regenerating keywords", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} showPreview={true} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "shoes\nsneakers");

      await waitFor(() => {
        expect(screen.getByText("shoes")).toBeInTheDocument();
      });

      // Exclude "shoes"
      await user.click(
        screen.getByRole("button", { name: /delete keyword: shoes/i })
      );

      await waitFor(() => {
        expect(screen.queryByText("shoes")).not.toBeInTheDocument();
      });

      // Add another term - "shoes" should stay excluded
      await user.type(coreArea, "\nboots");

      await waitFor(() => {
        expect(screen.getByText("sneakers")).toBeInTheDocument();
        expect(screen.getByText("boots")).toBeInTheDocument();
        // "shoes" should still be excluded
        expect(screen.queryByRole("cell", { name: "shoes" })).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("textareas have proper labels", () => {
      render(<KeywordCombinator onChange={onChange} />);

      expect(screen.getByLabelText(/prefixes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/core terms/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/suffixes/i)).toBeInTheDocument();
    });

    it("combination checkboxes are keyboard accessible", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} />);

      // Tab through the form to reach checkboxes
      const coreOnlyCheckbox = screen.getByLabelText(/core only/i);
      coreOnlyCheckbox.focus();
      expect(coreOnlyCheckbox).toHaveFocus();

      // Toggle with space
      await user.keyboard(" ");
      expect(coreOnlyCheckbox).not.toBeChecked();

      await user.keyboard(" ");
      expect(coreOnlyCheckbox).toBeChecked();
    });

    it("restore button is keyboard accessible", async () => {
      const user = userEvent.setup();

      render(<KeywordCombinator onChange={onChange} showPreview={true} />);

      const coreArea = screen.getByLabelText(/core terms/i);
      await user.type(coreArea, "kbaccesstest");

      await waitFor(() => {
        // Look in the table for the keyword
        const table = screen.getByRole("table");
        expect(within(table).getByText("kbaccesstest")).toBeInTheDocument();
      });

      // Exclude keyword
      await user.click(
        screen.getByRole("button", { name: /delete keyword: kbaccesstest/i })
      );

      await waitFor(() => {
        const restoreButton = screen.getByRole("button", { name: /restore all/i });
        expect(restoreButton).toBeInTheDocument();
      });

      const restoreButton = screen.getByRole("button", { name: /restore all/i });
      restoreButton.focus();
      await user.keyboard("{Enter}");

      await waitFor(() => {
        // Look in the table for the restored keyword
        const table = screen.getByRole("table");
        expect(within(table).getByText("kbaccesstest")).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Re-render Tests
  // ==========================================================================

  describe("Re-render Behavior", () => {
    it("calls onChange on initial render with empty array when no keywords", () => {
      render(<KeywordCombinator onChange={onChange} />);

      expect(onChange).toHaveBeenCalledWith([]);
    });

    it("updates when sampleRow changes", async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <KeywordCombinator
          onChange={onChange}
          showPreview={true}
          sampleRow={{ product: "InitialValue" }}
        />
      );

      const coreArea = screen.getByLabelText(/core terms/i);
      // Use paste for curly braces
      await user.clear(coreArea);
      await user.click(coreArea);
      await user.paste("{product}");

      await waitFor(() => {
        expect(screen.getByText("InitialValue")).toBeInTheDocument();
      });

      // Update sampleRow
      rerender(
        <KeywordCombinator
          onChange={onChange}
          showPreview={true}
          sampleRow={{ product: "UpdatedValue" }}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("UpdatedValue")).toBeInTheDocument();
      });
    });
  });
});
