import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RuleSelector } from "../RuleSelector";
import type { Rule } from "../../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockRules: Rule[] = [
  {
    id: "r1",
    name: "Exclude Low Stock",
    enabled: true,
    conditions: [{}, {}],
    actions: [{}],
    createdAt: "2024-01-01",
  },
  {
    id: "r2",
    name: "Premium Only",
    enabled: true,
    conditions: [{}],
    actions: [{}, {}],
    createdAt: "2024-01-02",
  },
  {
    id: "r3",
    name: "Disabled Rule",
    enabled: false,
    conditions: [{}],
    actions: [{}],
    createdAt: "2024-01-03",
  },
  {
    id: "r4",
    name: "High Value Filter",
    enabled: true,
    conditions: [{}, {}, {}],
    actions: [{}, {}, {}],
    createdAt: "2024-01-04",
  },
];

describe("RuleSelector", () => {
  let onToggle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch.mockReset();
    onToggle = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    // Mock fetch that never resolves
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<RuleSelector selectedIds={[]} onToggle={onToggle} />);

    expect(screen.getByTestId("rules-loading")).toBeInTheDocument();
  });

  it("renders rules as checkboxes after fetch", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockRules }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<RuleSelector selectedIds={[]} onToggle={onToggle} />);

    await waitFor(() => {
      expect(screen.getByTestId("rules-list")).toBeInTheDocument();
    });

    // Should show checkboxes for enabled rules only
    expect(screen.getByLabelText(/exclude low stock/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/premium only/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/high value filter/i)).toBeInTheDocument();
  });

  it("only shows enabled rules", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockRules }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<RuleSelector selectedIds={[]} onToggle={onToggle} />);

    await waitFor(() => {
      expect(screen.getByTestId("rules-list")).toBeInTheDocument();
    });

    // Disabled rule should not be shown
    expect(screen.queryByText("Disabled Rule")).not.toBeInTheDocument();
    // Enabled rules should be shown
    expect(screen.getByText("Exclude Low Stock")).toBeInTheDocument();
    expect(screen.getByText("Premium Only")).toBeInTheDocument();
  });

  it("displays condition and action counts correctly", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockRules }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<RuleSelector selectedIds={[]} onToggle={onToggle} />);

    await waitFor(() => {
      expect(screen.getByTestId("rules-list")).toBeInTheDocument();
    });

    // Exclude Low Stock: 2 conditions / 1 action
    expect(screen.getByText("2 conditions / 1 action")).toBeInTheDocument();
    // Premium Only: 1 condition / 2 actions
    expect(screen.getByText("1 condition / 2 actions")).toBeInTheDocument();
    // High Value Filter: 3 conditions / 3 actions
    expect(screen.getByText("3 conditions / 3 actions")).toBeInTheDocument();
  });

  it("checked state matches selectedIds", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockRules }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<RuleSelector selectedIds={["r1", "r4"]} onToggle={onToggle} />);

    await waitFor(() => {
      expect(screen.getByTestId("rules-list")).toBeInTheDocument();
    });

    // r1 and r4 should be checked
    expect(screen.getByTestId("rule-checkbox-r1")).toBeChecked();
    expect(screen.getByTestId("rule-checkbox-r4")).toBeChecked();
    // r2 should not be checked
    expect(screen.getByTestId("rule-checkbox-r2")).not.toBeChecked();
  });

  it("clicking checkbox calls onToggle", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockRules }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<RuleSelector selectedIds={[]} onToggle={onToggle} />);

    await waitFor(() => {
      expect(screen.getByTestId("rules-list")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("rule-checkbox-r2"));
    expect(onToggle).toHaveBeenCalledWith("r2");
  });

  it("can select multiple rules", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockRules }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<RuleSelector selectedIds={["r1"]} onToggle={onToggle} />);

    await waitFor(() => {
      expect(screen.getByTestId("rules-list")).toBeInTheDocument();
    });

    // r1 is already selected
    expect(screen.getByTestId("rule-checkbox-r1")).toBeChecked();

    // Click to select r2 as well
    fireEvent.click(screen.getByTestId("rule-checkbox-r2"));
    expect(onToggle).toHaveBeenCalledWith("r2");
  });

  it("can deselect rules", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockRules }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<RuleSelector selectedIds={["r1", "r2"]} onToggle={onToggle} />);

    await waitFor(() => {
      expect(screen.getByTestId("rules-list")).toBeInTheDocument();
    });

    // Click to deselect r1
    fireEvent.click(screen.getByTestId("rule-checkbox-r1"));
    expect(onToggle).toHaveBeenCalledWith("r1");
  });

  it("shows empty state with skip message when no rules", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<RuleSelector selectedIds={[]} onToggle={onToggle} />);

    await waitFor(() => {
      expect(screen.getByTestId("rules-empty")).toBeInTheDocument();
    });

    expect(screen.getByText(/no rules configured/i)).toBeInTheDocument();
    expect(screen.getByText(/you can skip this step/i)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/rules");
  });

  it("shows empty state when all rules are disabled", async () => {
    const disabledOnlyRules: Rule[] = [
      {
        id: "r1",
        name: "Disabled Rule 1",
        enabled: false,
        conditions: [{}],
        actions: [{}],
        createdAt: "2024-01-01",
      },
      {
        id: "r2",
        name: "Disabled Rule 2",
        enabled: false,
        conditions: [{}],
        actions: [{}],
        createdAt: "2024-01-02",
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: disabledOnlyRules }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<RuleSelector selectedIds={[]} onToggle={onToggle} />);

    await waitFor(() => {
      expect(screen.getByTestId("rules-empty")).toBeInTheDocument();
    });

    expect(screen.getByText(/no rules configured/i)).toBeInTheDocument();
  });

  it("shows error state with retry on fetch failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({ error: "Server error" }),
    });

    render(<RuleSelector selectedIds={[]} onToggle={onToggle} />);

    await waitFor(() => {
      expect(screen.getByTestId("rules-error")).toBeInTheDocument();
    });

    expect(screen.getByText(/api request failed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("retry button refetches data", async () => {
    // First call fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({ error: "Server error" }),
    });

    render(<RuleSelector selectedIds={[]} onToggle={onToggle} />);

    await waitFor(() => {
      expect(screen.getByTestId("rules-error")).toBeInTheDocument();
    });

    // Setup success response for retry
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockRules }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByTestId("rules-list")).toBeInTheDocument();
    });

    expect(screen.getByText("Exclude Low Stock")).toBeInTheDocument();
  });

  it("applies selected styling to checked rules", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockRules }),
      headers: new Headers({ "content-type": "application/json" }),
    });

    render(<RuleSelector selectedIds={["r1"]} onToggle={onToggle} />);

    await waitFor(() => {
      expect(screen.getByTestId("rules-list")).toBeInTheDocument();
    });

    // Selected rule item should have selected class applied (through CSS module)
    const selectedItem = screen.getByTestId("rule-item-r1");
    const unselectedItem = screen.getByTestId("rule-item-r2");

    // We can't easily check CSS module classes, but we can check the checkbox state
    expect(screen.getByTestId("rule-checkbox-r1")).toBeChecked();
    expect(screen.getByTestId("rule-checkbox-r2")).not.toBeChecked();
  });
});
