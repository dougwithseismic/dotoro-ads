import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { KeywordConfig } from "../KeywordConfig";
import type {
  KeywordConfig as KeywordConfigType,
  KeywordRule,
  DataSourceColumn,
  ValidationResult,
} from "../../types";

const mockColumns: DataSourceColumn[] = [
  { name: "product_name", type: "string", sampleValues: ["Air Max", "Jordan", "Vaporfly"] },
  { name: "brand", type: "string", sampleValues: ["Nike", "Adidas", "Puma"] },
  { name: "category", type: "string", sampleValues: ["Running", "Basketball", "Lifestyle"] },
  { name: "price", type: "number", sampleValues: ["100", "150", "200"] },
];

const sampleRow: Record<string, unknown> = {
  product_name: "Air Max 90",
  brand: "Nike",
  category: "Lifestyle",
  price: 120,
};

const createRule = (overrides: Partial<KeywordRule> = {}): KeywordRule => ({
  id: `rule-${Math.random().toString(36).slice(2, 9)}`,
  name: "Test Keyword Rule",
  scope: "campaign",
  coreTermPattern: "{product_name}",
  prefixes: [],
  suffixes: [],
  matchTypes: ["broad"],
  ...overrides,
});

const defaultConfig: KeywordConfigType = {
  enabled: false,
  rules: [],
};

describe("KeywordConfig", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  // ==========================================================================
  // Enable/Disable Toggle Tests
  // ==========================================================================

  describe("Enable/Disable Toggle", () => {
    it("renders enable toggle checkbox", () => {
      render(
        <KeywordConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/enable keyword generation/i)).toBeInTheDocument();
    });

    it("shows disabled state when keywords are disabled", () => {
      render(
        <KeywordConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const toggle = screen.getByLabelText(/enable keyword generation/i);
      expect(toggle).not.toBeChecked();
    });

    it("shows enabled state when keywords are enabled", () => {
      const config: KeywordConfigType = {
        enabled: true,
        rules: [],
      };

      render(
        <KeywordConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const toggle = screen.getByLabelText(/enable keyword generation/i);
      expect(toggle).toBeChecked();
    });

    it("calls onChange with enabled=true when toggle is clicked", async () => {
      const user = userEvent.setup();

      render(
        <KeywordConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const toggle = screen.getByLabelText(/enable keyword generation/i);
      await user.click(toggle);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true })
      );
    });

    it("calls onChange with null when disabled", async () => {
      const user = userEvent.setup();
      const config: KeywordConfigType = {
        enabled: true,
        rules: [],
      };

      render(
        <KeywordConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const toggle = screen.getByLabelText(/enable keyword generation/i);
      await user.click(toggle);

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("hides rule configuration when disabled", () => {
      render(
        <KeywordConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.queryByTestId("keyword-rules-section")).not.toBeInTheDocument();
    });

    it("shows rule configuration when enabled", () => {
      const config: KeywordConfigType = {
        enabled: true,
        rules: [],
      };

      render(
        <KeywordConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("keyword-rules-section")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Add Keyword Rule Tests
  // ==========================================================================

  describe("Add Keyword Rule", () => {
    it("renders 'Add Keyword Rule' button when enabled", () => {
      const config: KeywordConfigType = {
        enabled: true,
        rules: [],
      };

      render(
        <KeywordConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByRole("button", { name: /add keyword rule/i })).toBeInTheDocument();
    });

    it("adds a new rule when button is clicked", async () => {
      const user = userEvent.setup();
      const config: KeywordConfigType = {
        enabled: true,
        rules: [],
      };

      render(
        <KeywordConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole("button", { name: /add keyword rule/i }));

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: expect.arrayContaining([
            expect.objectContaining({
              coreTermPattern: "",
              prefixes: [],
              suffixes: [],
              matchTypes: ["broad"],
            }),
          ]),
        })
      );
    });

    it("shows empty state message when no rules exist", () => {
      const config: KeywordConfigType = {
        enabled: true,
        rules: [],
      };

      render(
        <KeywordConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByText(/no keyword rules defined/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Rule Builder Tests
  // ==========================================================================

  describe("Rule Builder", () => {
    const configWithRule: KeywordConfigType = {
      enabled: true,
      rules: [createRule({ id: "rule-1" })],
    };

    it("renders core term pattern input for each rule", () => {
      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/core term pattern/i)).toBeInTheDocument();
    });

    it("shows variable autocomplete in core term input", async () => {
      const user = userEvent.setup();

      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const coreTermInput = screen.getByLabelText(/core term pattern/i);
      await user.clear(coreTermInput);
      await user.type(coreTermInput, "{{");

      await waitFor(() => {
        expect(screen.getByTestId("variable-dropdown")).toBeInTheDocument();
      });

      expect(screen.getByText("product_name")).toBeInTheDocument();
      expect(screen.getByText("brand")).toBeInTheDocument();
    });

    it("updates rule when core term is changed", async () => {
      const user = userEvent.setup();

      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const coreTermInput = screen.getByLabelText(/core term pattern/i);
      await user.clear(coreTermInput);
      await user.type(coreTermInput, "{{brand}}");

      expect(onChange).toHaveBeenCalled();
    });

    it("renders prefix input field", () => {
      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/prefixes/i)).toBeInTheDocument();
    });

    it("renders suffix input field", () => {
      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/suffixes/i)).toBeInTheDocument();
    });

    it("parses comma-separated prefixes", async () => {
      const user = userEvent.setup();

      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const prefixInput = screen.getByLabelText(/prefixes/i);
      await user.clear(prefixInput);
      await user.type(prefixInput, "buy, cheap, best");

      // Trigger blur to commit the value
      await user.tab();

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: expect.arrayContaining([
            expect.objectContaining({
              prefixes: ["buy", "cheap", "best"],
            }),
          ]),
        })
      );
    });

    it("parses comma-separated suffixes", async () => {
      const user = userEvent.setup();

      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const suffixInput = screen.getByLabelText(/suffixes/i);
      await user.clear(suffixInput);
      await user.type(suffixInput, "online, sale, near me");
      await user.tab();

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: expect.arrayContaining([
            expect.objectContaining({
              suffixes: ["online", "sale", "near me"],
            }),
          ]),
        })
      );
    });

    it("shows hint text for prefix/suffix input format", () => {
      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Multiple hints contain "comma-separated" - check that at least one exists
      const hints = screen.getAllByText(/comma-separated/i);
      expect(hints.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Match Type Tests
  // ==========================================================================

  describe("Match Type Checkboxes", () => {
    const configWithRule: KeywordConfigType = {
      enabled: true,
      rules: [createRule({ id: "rule-1", matchTypes: ["broad"] })],
    };

    it("renders match type checkboxes for broad, phrase, exact", () => {
      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/broad/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phrase/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/exact/i)).toBeInTheDocument();
    });

    it("shows checked state for selected match types", () => {
      const config: KeywordConfigType = {
        enabled: true,
        rules: [createRule({ id: "rule-1", matchTypes: ["broad", "exact"] })],
      };

      render(
        <KeywordConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/broad/i)).toBeChecked();
      expect(screen.getByLabelText(/phrase/i)).not.toBeChecked();
      expect(screen.getByLabelText(/exact/i)).toBeChecked();
    });

    it("toggles match type when checkbox is clicked", async () => {
      const user = userEvent.setup();

      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const phraseCheckbox = screen.getByLabelText(/phrase/i);
      await user.click(phraseCheckbox);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: expect.arrayContaining([
            expect.objectContaining({
              matchTypes: expect.arrayContaining(["broad", "phrase"]),
            }),
          ]),
        })
      );
    });

    it("removes match type when unchecked", async () => {
      const user = userEvent.setup();
      const config: KeywordConfigType = {
        enabled: true,
        rules: [createRule({ id: "rule-1", matchTypes: ["broad", "phrase"] })],
      };

      render(
        <KeywordConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const broadCheckbox = screen.getByLabelText(/broad/i);
      await user.click(broadCheckbox);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: expect.arrayContaining([
            expect.objectContaining({
              matchTypes: ["phrase"],
            }),
          ]),
        })
      );
    });
  });

  // ==========================================================================
  // Negative Keywords Tests
  // ==========================================================================

  describe("Negative Keywords", () => {
    const configWithRule: KeywordConfigType = {
      enabled: true,
      rules: [createRule({ id: "rule-1" })],
    };

    it("renders negative keywords input", () => {
      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/negative keywords/i)).toBeInTheDocument();
    });

    it("parses comma-separated negative keywords", async () => {
      const user = userEvent.setup();

      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const negativeInput = screen.getByLabelText(/negative keywords/i);
      await user.type(negativeInput, "free, cheap, discount");
      await user.tab();

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: expect.arrayContaining([
            expect.objectContaining({
              negativeKeywords: ["free", "cheap", "discount"],
            }),
          ]),
        })
      );
    });

    it("supports variable syntax in negative keywords", async () => {
      const user = userEvent.setup();

      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const negativeInput = screen.getByLabelText(/negative keywords/i);
      await user.type(negativeInput, "{{brand}} fake, counterfeit");
      await user.tab();

      expect(onChange).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Keyword Preview Tests
  // ==========================================================================

  describe("Keyword Preview", () => {
    const configWithRuleAndSample: KeywordConfigType = {
      enabled: true,
      rules: [
        createRule({
          id: "rule-1",
          coreTermPattern: "{product_name}",
          prefixes: ["buy", ""],
          suffixes: ["online", ""],
          matchTypes: ["broad", "exact"],
        }),
      ],
    };

    it("shows keyword preview section when sampleRow is provided", () => {
      render(
        <KeywordConfig
          config={configWithRuleAndSample}
          availableColumns={mockColumns}
          sampleRow={sampleRow}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("keyword-preview")).toBeInTheDocument();
    });

    it("displays generated keyword examples", () => {
      render(
        <KeywordConfig
          config={configWithRuleAndSample}
          availableColumns={mockColumns}
          sampleRow={sampleRow}
          onChange={onChange}
        />
      );

      // Should show some generated keywords based on the sample row (lowercase normalized)
      // The keywordText class contains the keyword text
      const previewKeywords = screen.getAllByText(/air max 90/i);
      expect(previewKeywords.length).toBeGreaterThan(0);
    });

    it("shows keyword count estimate", () => {
      render(
        <KeywordConfig
          config={configWithRuleAndSample}
          availableColumns={mockColumns}
          sampleRow={sampleRow}
          onChange={onChange}
        />
      );

      // 2 prefixes x 2 suffixes x 2 match types = 8 keywords
      expect(screen.getByText(/8 keywords/i)).toBeInTheDocument();
    });

    it("shows match type badges in preview", () => {
      render(
        <KeywordConfig
          config={configWithRuleAndSample}
          availableColumns={mockColumns}
          sampleRow={sampleRow}
          onChange={onChange}
        />
      );

      const preview = screen.getByTestId("keyword-preview");
      // Multiple keywords with broad/exact badges
      expect(within(preview).getAllByText("broad").length).toBeGreaterThan(0);
      expect(within(preview).getAllByText("exact").length).toBeGreaterThan(0);
    });

    it("updates preview when rule changes", async () => {
      const user = userEvent.setup();
      const config: KeywordConfigType = {
        enabled: true,
        rules: [createRule({ id: "rule-1", coreTermPattern: "{brand}" })],
      };

      const { rerender } = render(
        <KeywordConfig
          config={config}
          availableColumns={mockColumns}
          sampleRow={sampleRow}
          onChange={onChange}
        />
      );

      // Initial render should show brand value
      expect(screen.getByText(/nike/i)).toBeInTheDocument();

      // Simulate parent updating config
      const updatedConfig: KeywordConfigType = {
        enabled: true,
        rules: [createRule({ id: "rule-1", coreTermPattern: "{product_name}" })],
      };

      rerender(
        <KeywordConfig
          config={updatedConfig}
          availableColumns={mockColumns}
          sampleRow={sampleRow}
          onChange={onChange}
        />
      );

      // Should now show product_name value
      expect(screen.getByText(/air max 90/i)).toBeInTheDocument();
    });

    it("shows message when no sample row is provided", () => {
      render(
        <KeywordConfig
          config={configWithRuleAndSample}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByText(/select a data source to see preview/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Delete Rule Tests
  // ==========================================================================

  describe("Delete Rule", () => {
    const configWithMultipleRules: KeywordConfigType = {
      enabled: true,
      rules: [
        createRule({ id: "rule-1", coreTermPattern: "{product_name}" }),
        createRule({ id: "rule-2", coreTermPattern: "{brand}" }),
      ],
    };

    it("renders delete button for each rule", () => {
      render(
        <KeywordConfig
          config={configWithMultipleRules}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const deleteButtons = screen.getAllByRole("button", { name: /delete rule/i });
      expect(deleteButtons).toHaveLength(2);
    });

    it("removes rule when delete button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <KeywordConfig
          config={configWithMultipleRules}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const deleteButtons = screen.getAllByRole("button", { name: /delete rule/i });
      await user.click(deleteButtons[0]!);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: expect.arrayContaining([
            expect.objectContaining({ id: "rule-2" }),
          ]),
        })
      );

      // Should not contain the deleted rule
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0].rules).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Validation Display Tests
  // ==========================================================================

  describe("Validation Display", () => {
    const configWithRule: KeywordConfigType = {
      enabled: true,
      rules: [createRule({ id: "rule-1" })],
    };

    it("displays validation errors", () => {
      const validation: ValidationResult = {
        valid: false,
        errors: ["Keyword rule 1: Core term pattern is required"],
        warnings: [],
      };

      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      expect(screen.getByTestId("validation-errors")).toBeInTheDocument();
      expect(screen.getByText(/core term pattern is required/i)).toBeInTheDocument();
    });

    it("displays validation warnings", () => {
      const validation: ValidationResult = {
        valid: true,
        errors: [],
        warnings: ["Consider adding more match types for better coverage"],
      };

      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      expect(screen.getByTestId("validation-warnings")).toBeInTheDocument();
    });

    it("highlights invalid rules", () => {
      const validation: ValidationResult = {
        valid: false,
        errors: ["Keyword rule 1: At least one match type is required"],
        warnings: [],
      };

      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      const ruleCard = screen.getByTestId("keyword-rule-card-rule-1");
      expect(ruleCard).toHaveAttribute("data-invalid", "true");
    });
  });

  // ==========================================================================
  // Inheritance Visualization Tests
  // ==========================================================================

  describe("Inheritance Visualization", () => {
    it("shows campaign-level indicator for campaign-scoped rules", () => {
      const config: KeywordConfigType = {
        enabled: true,
        rules: [createRule({ id: "rule-1", scope: "campaign" } as KeywordRule & { scope: string })],
      };

      render(
        <KeywordConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Should indicate this is a campaign-level rule
      expect(screen.getByText(/campaign level/i)).toBeInTheDocument();
    });

    it("shows inheritance info in preview", () => {
      const config: KeywordConfigType = {
        enabled: true,
        rules: [createRule({ id: "rule-1" })],
      };

      render(
        <KeywordConfig
          config={config}
          availableColumns={mockColumns}
          sampleRow={sampleRow}
          onChange={onChange}
        />
      );

      expect(screen.getByText(/applies to all ad groups/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    const configWithRule: KeywordConfigType = {
      enabled: true,
      rules: [createRule({ id: "rule-1" })],
    };

    it("has proper ARIA labels for form elements", () => {
      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Core term input has label and describedby for hint
      const coreTermInput = screen.getByRole("combobox", { name: /core term pattern/i });
      expect(coreTermInput).toBeInTheDocument();
      expect(coreTermInput).toHaveAttribute("aria-describedby");

      // Match types group exists (may be multiple if multiple rules)
      const matchTypeGroups = screen.getAllByRole("group", { name: /match types/i });
      expect(matchTypeGroups.length).toBeGreaterThan(0);
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();

      // Test with disabled config first (simpler focus order)
      const { rerender } = render(
        <KeywordConfig
          config={defaultConfig}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Tab to the enable checkbox
      await user.tab();
      expect(screen.getByLabelText(/enable keyword generation/i)).toHaveFocus();

      // Now test with enabled config
      rerender(
        <KeywordConfig
          config={{ enabled: true, rules: [] }}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      // Should have add button that's focusable
      const addButton = screen.getByRole("button", { name: /add keyword rule/i });
      expect(addButton).toBeInTheDocument();
    });

    it("announces validation errors to screen readers", () => {
      const validation: ValidationResult = {
        valid: false,
        errors: ["Error message"],
        warnings: [],
      };

      render(
        <KeywordConfig
          config={configWithRule}
          availableColumns={mockColumns}
          onChange={onChange}
          validation={validation}
        />
      );

      const errorSection = screen.getByTestId("validation-errors");
      expect(errorSection).toHaveAttribute("role", "alert");
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles null config gracefully", () => {
      render(
        <KeywordConfig
          config={null}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText(/enable keyword generation/i)).not.toBeChecked();
    });

    it("handles empty columns list", () => {
      const config: KeywordConfigType = {
        enabled: true,
        rules: [createRule({ id: "rule-1" })],
      };

      render(
        <KeywordConfig
          config={config}
          availableColumns={[]}
          onChange={onChange}
        />
      );

      expect(screen.getByText(/no variables available/i)).toBeInTheDocument();
    });

    it("handles many rules efficiently", () => {
      const manyRules = Array.from({ length: 10 }, (_, i) =>
        createRule({ id: `rule-${i}`, coreTermPattern: `{product_name}-${i}` })
      );
      const config: KeywordConfigType = {
        enabled: true,
        rules: manyRules,
      };

      render(
        <KeywordConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const ruleCards = screen.getAllByTestId(/keyword-rule-card-/);
      expect(ruleCards).toHaveLength(10);
    });

    it("handles special characters in prefixes/suffixes", async () => {
      const user = userEvent.setup();
      const config: KeywordConfigType = {
        enabled: true,
        rules: [createRule({ id: "rule-1" })],
      };

      render(
        <KeywordConfig
          config={config}
          availableColumns={mockColumns}
          onChange={onChange}
        />
      );

      const prefixInput = screen.getByLabelText(/prefixes/i);
      await user.type(prefixInput, "what's, #1, best-in-class");
      await user.tab();

      expect(onChange).toHaveBeenCalled();
    });
  });
});
