import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TransformPreview } from "../TransformPreview";
import type { PreviewResponse } from "../../../types";

describe("TransformPreview", () => {
  it("displays loading state", () => {
    render(
      <TransformPreview preview={null} loading={true} error={null} />
    );

    expect(screen.getByText(/generating preview/i)).toBeInTheDocument();
  });

  it("displays error state", () => {
    render(
      <TransformPreview
        preview={null}
        loading={false}
        error="Failed to generate preview"
      />
    );

    expect(screen.getByText("Failed to generate preview")).toBeInTheDocument();
  });

  it("displays empty state when no preview", () => {
    render(
      <TransformPreview preview={null} loading={false} error={null} />
    );

    expect(
      screen.getByText(/configure your transform to see a preview/i)
    ).toBeInTheDocument();
  });

  it("displays preview data in table", () => {
    const preview: PreviewResponse = {
      rows: [
        { brand: "Nike", product_count: 127, min_price: 49.99 },
        { brand: "Adidas", product_count: 89, min_price: 39.99 },
      ],
      groupCount: 43,
      sourceRowCount: 2847,
      warnings: [],
    };

    render(
      <TransformPreview preview={preview} loading={false} error={null} />
    );

    // Should show stats (flexible matching)
    expect(screen.getByText("2,847 source rows")).toBeInTheDocument();
    expect(screen.getByText("43 groups")).toBeInTheDocument();

    // Should show column headers
    expect(screen.getByText("brand")).toBeInTheDocument();
    expect(screen.getByText("product_count")).toBeInTheDocument();
    expect(screen.getByText("min_price")).toBeInTheDocument();

    // Should show data
    expect(screen.getByText("Nike")).toBeInTheDocument();
    expect(screen.getByText("127")).toBeInTheDocument();
  });

  it("displays warnings when present", () => {
    const preview: PreviewResponse = {
      rows: [{ brand: "Nike", count: 10 }],
      groupCount: 1,
      sourceRowCount: 100,
      warnings: [
        {
          type: "warning",
          code: "FIRST_NON_DETERMINISTIC",
          message: "FIRST function may return different values on re-execution",
        },
      ],
    };

    render(
      <TransformPreview preview={preview} loading={false} error={null} />
    );

    expect(
      screen.getByText(/FIRST function may return different values/i)
    ).toBeInTheDocument();
  });

  it("handles null values in data", () => {
    const preview: PreviewResponse = {
      rows: [{ brand: "Nike", optional_field: null }],
      groupCount: 1,
      sourceRowCount: 10,
      warnings: [],
    };

    render(
      <TransformPreview preview={preview} loading={false} error={null} />
    );

    expect(screen.getByText("null")).toBeInTheDocument();
  });

  it("handles array values in data", () => {
    const preview: PreviewResponse = {
      rows: [{ brand: "Nike", all_skus: ["SKU1", "SKU2", "SKU3"] }],
      groupCount: 1,
      sourceRowCount: 10,
      warnings: [],
    };

    render(
      <TransformPreview preview={preview} loading={false} error={null} />
    );

    expect(screen.getByText("[3 items]")).toBeInTheDocument();
  });

  it("shows footer with row count info", () => {
    const preview: PreviewResponse = {
      rows: [
        { brand: "Nike", count: 10 },
        { brand: "Adidas", count: 5 },
      ],
      groupCount: 43,
      sourceRowCount: 100,
      warnings: [],
    };

    render(
      <TransformPreview preview={preview} loading={false} error={null} />
    );

    expect(screen.getByText(/showing 2 of 43 groups/i)).toBeInTheDocument();
  });
});
