import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BillingTab } from "../BillingTab";
import type { TeamDetail } from "@/lib/teams";

// Mock team data
const createMockTeam = (overrides: Partial<TeamDetail> = {}): TeamDetail => ({
  id: "team-1",
  name: "Test Team",
  slug: "test-team",
  description: "A test team",
  avatarUrl: null,
  plan: "free",
  memberCount: 3,
  role: "owner",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  settings: null,
  billingEmail: null,
  ...overrides,
});

describe("BillingTab", () => {
  const defaultProps = {
    team: createMockTeam(),
    onUpdateBillingEmail: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the billing tab", () => {
      render(<BillingTab {...defaultProps} />);

      expect(screen.getByTestId("billing-tab")).toBeInTheDocument();
    });

    it("displays current plan section", () => {
      render(<BillingTab {...defaultProps} />);

      expect(screen.getByText("Current Plan")).toBeInTheDocument();
    });

    it("shows PlanBadge with correct plan", () => {
      render(<BillingTab {...defaultProps} />);

      expect(screen.getByTestId("plan-badge")).toHaveAttribute(
        "data-plan",
        "free"
      );
    });

    it("displays plan comparison table", () => {
      render(<BillingTab {...defaultProps} />);

      expect(screen.getByTestId("plan-comparison-table")).toBeInTheDocument();
    });

    it("displays billing email form for owners", () => {
      render(<BillingTab {...defaultProps} />);

      expect(screen.getByTestId("billing-email-form")).toBeInTheDocument();
    });
  });

  describe("plan display", () => {
    it("shows free plan correctly", () => {
      render(<BillingTab {...defaultProps} team={createMockTeam({ plan: "free" })} />);

      expect(screen.getByTestId("plan-badge")).toHaveAttribute("data-plan", "free");
    });

    it("shows pro plan correctly", () => {
      render(<BillingTab {...defaultProps} team={createMockTeam({ plan: "pro" })} />);

      expect(screen.getByTestId("plan-badge")).toHaveAttribute("data-plan", "pro");
    });

    it("shows enterprise plan correctly", () => {
      render(
        <BillingTab
          {...defaultProps}
          team={createMockTeam({ plan: "enterprise" })}
        />
      );

      expect(screen.getByTestId("plan-badge")).toHaveAttribute(
        "data-plan",
        "enterprise"
      );
    });
  });

  describe("upgrade CTA", () => {
    it("shows upgrade button for free plan", () => {
      render(<BillingTab {...defaultProps} team={createMockTeam({ plan: "free" })} />);

      expect(screen.getByRole("button", { name: /upgrade/i })).toBeInTheDocument();
    });

    it("shows upgrade button for pro plan", () => {
      render(<BillingTab {...defaultProps} team={createMockTeam({ plan: "pro" })} />);

      expect(
        screen.getByRole("button", { name: /upgrade to enterprise/i })
      ).toBeInTheDocument();
    });

    it("hides upgrade button for enterprise plan", () => {
      render(
        <BillingTab
          {...defaultProps}
          team={createMockTeam({ plan: "enterprise" })}
        />
      );

      expect(
        screen.queryByRole("button", { name: /upgrade/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("owner-only access", () => {
    it("shows full content for owners", () => {
      render(
        <BillingTab {...defaultProps} team={createMockTeam({ role: "owner" })} />
      );

      expect(screen.getByTestId("billing-email-form")).toBeInTheDocument();
      expect(
        screen.queryByText(/only the team owner can access/i)
      ).not.toBeInTheDocument();
    });

    it("shows restricted message for non-owners", () => {
      render(
        <BillingTab {...defaultProps} team={createMockTeam({ role: "admin" })} />
      );

      expect(
        screen.getByText(/only the team owner can manage billing/i)
      ).toBeInTheDocument();
    });

    it("still shows plan info for non-owners", () => {
      render(
        <BillingTab {...defaultProps} team={createMockTeam({ role: "admin" })} />
      );

      expect(screen.getByText("Current Plan")).toBeInTheDocument();
      expect(screen.getByTestId("plan-badge")).toBeInTheDocument();
    });
  });

  describe("billing email", () => {
    it("passes current billing email to form", () => {
      render(
        <BillingTab
          {...defaultProps}
          team={createMockTeam({ billingEmail: "billing@example.com" })}
        />
      );

      const input = screen.getByRole("textbox", { name: /billing email/i });
      expect(input).toHaveValue("billing@example.com");
    });

    it("passes empty value when no billing email", () => {
      render(
        <BillingTab {...defaultProps} team={createMockTeam({ billingEmail: null })} />
      );

      const input = screen.getByRole("textbox", { name: /billing email/i });
      expect(input).toHaveValue("");
    });
  });

  describe("usage placeholder", () => {
    it("shows usage stats placeholder section", () => {
      render(<BillingTab {...defaultProps} />);

      expect(screen.getByText("Usage")).toBeInTheDocument();
    });

    it("shows coming soon indicator", () => {
      render(<BillingTab {...defaultProps} />);

      expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    });
  });
});
