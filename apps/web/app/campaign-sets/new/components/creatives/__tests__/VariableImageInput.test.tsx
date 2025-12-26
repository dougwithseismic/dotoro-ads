import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VariableImageInput } from "../VariableImageInput";

describe("VariableImageInput", () => {
  let onChange: ReturnType<typeof vi.fn>;
  const columns = ["image_url", "product_image", "thumbnail"];
  const sampleData = [
    { image_url: "https://example.com/1.jpg", product_image: "https://example.com/p1.jpg" },
    { image_url: "https://example.com/2.jpg", product_image: "https://example.com/p2.jpg" },
  ];

  beforeEach(() => {
    onChange = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("column selection", () => {
    it("renders column selector", () => {
      render(
        <VariableImageInput
          value=""
          onChange={onChange}
          availableColumns={columns}
        />
      );

      expect(screen.getByTestId("column-select")).toBeInTheDocument();
    });

    it("shows available columns in dropdown", () => {
      render(
        <VariableImageInput
          value=""
          onChange={onChange}
          availableColumns={columns}
        />
      );

      const select = screen.getByTestId("column-select") as HTMLSelectElement;
      expect(select.options.length).toBe(columns.length + 1); // +1 for placeholder
    });

    it("calls onChange with pattern when column selected", () => {
      render(
        <VariableImageInput
          value=""
          onChange={onChange}
          availableColumns={columns}
        />
      );

      fireEvent.change(screen.getByTestId("column-select"), {
        target: { value: "image_url" },
      });

      expect(onChange).toHaveBeenCalledWith("{image_url}");
    });

    it("shows selected column value", () => {
      render(
        <VariableImageInput
          value="{product_image}"
          onChange={onChange}
          availableColumns={columns}
        />
      );

      const select = screen.getByTestId("column-select") as HTMLSelectElement;
      expect(select.value).toBe("product_image");
    });
  });

  describe("sample preview", () => {
    it("shows sample image preview when sample data provided", () => {
      render(
        <VariableImageInput
          value="{image_url}"
          onChange={onChange}
          availableColumns={columns}
          sampleData={sampleData}
        />
      );

      expect(screen.getByTestId("sample-preview")).toBeInTheDocument();
    });

    it("displays sample URL", () => {
      render(
        <VariableImageInput
          value="{image_url}"
          onChange={onChange}
          availableColumns={columns}
          sampleData={sampleData}
        />
      );

      expect(screen.getByText(/example.com\/1.jpg/)).toBeInTheDocument();
    });

    it("does not show preview when no column selected", () => {
      render(
        <VariableImageInput
          value=""
          onChange={onChange}
          availableColumns={columns}
          sampleData={sampleData}
        />
      );

      expect(screen.queryByTestId("sample-preview")).not.toBeInTheDocument();
    });
  });

  describe("label and help text", () => {
    it("displays label", () => {
      render(
        <VariableImageInput
          value=""
          onChange={onChange}
          availableColumns={columns}
          label="Image URL Column"
        />
      );

      expect(screen.getByText("Image URL Column")).toBeInTheDocument();
    });

    it("displays help text", () => {
      render(
        <VariableImageInput
          value=""
          onChange={onChange}
          availableColumns={columns}
          helpText="Select the column containing image URLs"
        />
      );

      expect(screen.getByText(/Select the column/)).toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("disables select when disabled", () => {
      render(
        <VariableImageInput
          value=""
          onChange={onChange}
          availableColumns={columns}
          disabled
        />
      );

      expect(screen.getByTestId("column-select")).toBeDisabled();
    });
  });

  describe("error state", () => {
    it("shows error message when provided", () => {
      render(
        <VariableImageInput
          value=""
          onChange={onChange}
          availableColumns={columns}
          error="Column required"
        />
      );

      expect(screen.getByText("Column required")).toBeInTheDocument();
    });
  });
});
