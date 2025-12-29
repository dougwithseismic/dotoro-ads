import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanComparisonTable } from "../PlanComparisonTable";

describe("PlanComparisonTable", () => {
  describe("rendering", () => {
    it("renders the comparison table", () => {
      render(<PlanComparisonTable currentPlan="free" />);

      expect(screen.getByTestId("plan-comparison-table")).toBeInTheDocument();
    });

    it("displays all three plan columns", () => {
      render(<PlanComparisonTable currentPlan="free" />);

      expect(screen.getByText("Free")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
      expect(screen.getByText("Enterprise")).toBeInTheDocument();
    });

    it("displays feature rows", () => {
      render(<PlanComparisonTable currentPlan="free" />);

      expect(screen.getByText("Team members")).toBeInTheDocument();
      expect(screen.getByText("Campaign sets")).toBeInTheDocument();
      expect(screen.getByText("Data sources")).toBeInTheDocument();
      expect(screen.getByText("API access")).toBeInTheDocument();
      expect(screen.getByText("Support level")).toBeInTheDocument();
    });
  });

  describe("feature limits", () => {
    it("shows correct member limits", () => {
      render(<PlanComparisonTable currentPlan="free" />);

      const memberRow = screen.getByTestId("feature-row-members");
      expect(within(memberRow).getByText("3")).toBeInTheDocument();
      expect(within(memberRow).getByText("25")).toBeInTheDocument();
      expect(within(memberRow).getByText("Unlimited")).toBeInTheDocument();
    });

    it("shows correct campaign sets limits", () => {
      render(<PlanComparisonTable currentPlan="free" />);

      const campaignRow = screen.getByTestId("feature-row-campaigns");
      expect(within(campaignRow).getByText("5")).toBeInTheDocument();
      expect(within(campaignRow).getByText("50")).toBeInTheDocument();
      expect(within(campaignRow).getByText("Unlimited")).toBeInTheDocument();
    });

    it("shows correct data sources limits", () => {
      render(<PlanComparisonTable currentPlan="free" />);

      const dataRow = screen.getByTestId("feature-row-data-sources");
      expect(within(dataRow).getByText("2")).toBeInTheDocument();
      expect(within(dataRow).getByText("10")).toBeInTheDocument();
      expect(within(dataRow).getByText("Unlimited")).toBeInTheDocument();
    });
  });

  describe("boolean features", () => {
    it("shows API access icons correctly", () => {
      render(<PlanComparisonTable currentPlan="free" />);

      const apiRow = screen.getByTestId("feature-row-api");
      const icons = within(apiRow).getAllByTestId(/feature-(check|x)-icon/);
      expect(icons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("current plan highlighting", () => {
    it("highlights Free column when current plan is free", () => {
      render(<PlanComparisonTable currentPlan="free" />);

      const freeHeader = screen.getByTestId("plan-column-free");
      expect(freeHeader).toHaveAttribute("data-current", "true");
    });

    it("highlights Pro column when current plan is pro", () => {
      render(<PlanComparisonTable currentPlan="pro" />);

      const proHeader = screen.getByTestId("plan-column-pro");
      expect(proHeader).toHaveAttribute("data-current", "true");
    });

    it("highlights Enterprise column when current plan is enterprise", () => {
      render(<PlanComparisonTable currentPlan="enterprise" />);

      const enterpriseHeader = screen.getByTestId("plan-column-enterprise");
      expect(enterpriseHeader).toHaveAttribute("data-current", "true");
    });

    it("shows 'Current' badge on current plan column", () => {
      render(<PlanComparisonTable currentPlan="pro" />);

      const proHeader = screen.getByTestId("plan-column-pro");
      expect(within(proHeader).getByText("Current")).toBeInTheDocument();
    });
  });

  describe("support levels", () => {
    it("shows correct support levels", () => {
      render(<PlanComparisonTable currentPlan="free" />);

      const supportRow = screen.getByTestId("feature-row-support");
      expect(within(supportRow).getByText("Community")).toBeInTheDocument();
      expect(within(supportRow).getByText("Email")).toBeInTheDocument();
      expect(within(supportRow).getByText("Dedicated")).toBeInTheDocument();
    });
  });

  describe("responsive behavior", () => {
    it("has horizontal scroll wrapper for mobile", () => {
      render(<PlanComparisonTable currentPlan="free" />);

      const wrapper = screen.getByTestId("plan-comparison-wrapper");
      expect(wrapper.className).toContain("overflow-x-auto");
    });
  });

  describe("accessibility", () => {
    it("uses proper table semantics", () => {
      render(<PlanComparisonTable currentPlan="free" />);

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getAllByRole("columnheader").length).toBeGreaterThan(0);
      expect(screen.getAllByRole("row").length).toBeGreaterThan(0);
    });

    it("has scope attributes on header cells", () => {
      render(<PlanComparisonTable currentPlan="free" />);

      const headers = screen.getAllByRole("columnheader");
      headers.forEach((header) => {
        expect(header).toHaveAttribute("scope", "col");
      });
    });
  });
});
