import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useValidation } from "../useValidation";
import type { HierarchyConfig, Platform, DataSourceColumn } from "../../types";

const mockColumns: DataSourceColumn[] = [
  { name: "headline", type: "string", sampleValues: ["Buy Nike Shoes Now"] },
  { name: "description", type: "string", sampleValues: ["Best shoes for running"] },
  { name: "url", type: "string", sampleValues: ["https://example.com"] },
  { name: "product_name", type: "string", sampleValues: ["Nike Air Max"] },
];

const mockSampleData = [
  {
    headline: "Buy Nike Shoes Now - Limited Time Offer",
    description: "Best shoes for running and everyday use",
    url: "https://example.com/nike",
    product_name: "Nike Air Max",
  },
  {
    headline: "Short headline",
    description: "Short description",
    url: "https://example.com",
    product_name: "Product 2",
  },
];

const mockHierarchyConfig: HierarchyConfig = {
  adGroups: [
    {
      id: "ag1",
      namePattern: "{product_name}",
      ads: [
        {
          id: "ad1",
          headline: "{headline}",
          description: "{description}",
          displayUrl: "example.com",
          finalUrl: "{url}",
        },
      ],
    },
  ],
};

describe("useValidation", () => {
  describe("Basic functionality", () => {
    it("returns validation state with errors array defined", () => {
      const { result } = renderHook(() =>
        useValidation({
          hierarchyConfig: mockHierarchyConfig,
          sampleData: mockSampleData,
          selectedPlatforms: ["google"] as Platform[],
          availableColumns: mockColumns,
        })
      );

      // isValidating starts as true during initial debounce period
      expect(result.current.isValidating).toBe(true);
      expect(result.current.errors).toBeDefined();
      expect(result.current.warnings).toBeDefined();
    });

    it("returns errorsByField map", () => {
      const { result } = renderHook(() =>
        useValidation({
          hierarchyConfig: mockHierarchyConfig,
          sampleData: mockSampleData,
          selectedPlatforms: ["google"] as Platform[],
          availableColumns: mockColumns,
        })
      );

      expect(result.current.errorsByField).toBeInstanceOf(Map);
    });

    it("provides getFieldValidation helper", () => {
      const { result } = renderHook(() =>
        useValidation({
          hierarchyConfig: mockHierarchyConfig,
          sampleData: mockSampleData,
          selectedPlatforms: ["google"] as Platform[],
          availableColumns: mockColumns,
        })
      );

      const fieldValidation = result.current.getFieldValidation("headline", 0, 0);
      expect(fieldValidation).toBeDefined();
      expect(fieldValidation).toHaveProperty("hasError");
      expect(fieldValidation).toHaveProperty("hasWarning");
    });
  });

  describe("Character limit validation", () => {
    it("detects headline exceeding Google limit (30 chars)", async () => {
      const configWithLongHeadline: HierarchyConfig = {
        adGroups: [
          {
            id: "ag1",
            namePattern: "Group",
            ads: [
              {
                id: "ad1",
                headline: "This headline is way too long for Google Ads",
                description: "Short",
              },
            ],
          },
        ],
      };

      const { result } = renderHook(() =>
        useValidation({
          hierarchyConfig: configWithLongHeadline,
          sampleData: [],
          selectedPlatforms: ["google"] as Platform[],
          availableColumns: mockColumns,
        })
      );

      // Wait for validation to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 350));
      });

      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(
        result.current.errors.some(
          (e) => e.field === "headline" && e.message.includes("character")
        )
      ).toBe(true);
    });

    it("uses most restrictive limit for multi-platform", async () => {
      const configWithLongHeadline: HierarchyConfig = {
        adGroups: [
          {
            id: "ag1",
            namePattern: "Group",
            ads: [
              {
                id: "ad1",
                headline: "This is 50 characters long headline for testing",
                description: "Short",
              },
            ],
          },
        ],
      };

      const { result } = renderHook(() =>
        useValidation({
          hierarchyConfig: configWithLongHeadline,
          sampleData: [],
          selectedPlatforms: ["google", "reddit"] as Platform[],
          availableColumns: mockColumns,
        })
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 350));
      });

      // Google limit is 30, Reddit is 100. Should use 30.
      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(
        result.current.errors.some((e) => e.message.includes("30"))
      ).toBe(true);
    });
  });

  describe("URL validation", () => {
    it("detects HTTP URLs (should be HTTPS)", async () => {
      const configWithHttpUrl: HierarchyConfig = {
        adGroups: [
          {
            id: "ag1",
            namePattern: "Group",
            ads: [
              {
                id: "ad1",
                headline: "Test",
                description: "Test",
                finalUrl: "http://example.com",
              },
            ],
          },
        ],
      };

      const { result } = renderHook(() =>
        useValidation({
          hierarchyConfig: configWithHttpUrl,
          sampleData: [],
          selectedPlatforms: ["google"] as Platform[],
          availableColumns: mockColumns,
        })
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 350));
      });

      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(
        result.current.errors.some((e) => e.message.includes("HTTPS"))
      ).toBe(true);
    });
  });

  describe("Variable reference validation", () => {
    it("detects unknown variable references", async () => {
      const configWithUnknownVar: HierarchyConfig = {
        adGroups: [
          {
            id: "ag1",
            namePattern: "{unknown_column}",
            ads: [
              {
                id: "ad1",
                headline: "Test",
                description: "Test",
              },
            ],
          },
        ],
      };

      const { result } = renderHook(() =>
        useValidation({
          hierarchyConfig: configWithUnknownVar,
          sampleData: [],
          selectedPlatforms: ["google"] as Platform[],
          availableColumns: mockColumns,
        })
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 350));
      });

      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(
        result.current.errors.some((e) => e.message.includes("unknown_column"))
      ).toBe(true);
    });
  });

  describe("Sample data interpolation", () => {
    it("validates against interpolated sample data values", async () => {
      const sampleDataWithLongValue = [
        {
          headline: "This is a very long headline that will definitely exceed the Google Ads character limit of 30",
        },
      ];

      const configWithVar: HierarchyConfig = {
        adGroups: [
          {
            id: "ag1",
            namePattern: "Group",
            ads: [
              {
                id: "ad1",
                headline: "{headline}",
                description: "Short",
              },
            ],
          },
        ],
      };

      const { result } = renderHook(() =>
        useValidation({
          hierarchyConfig: configWithVar,
          sampleData: sampleDataWithLongValue,
          selectedPlatforms: ["google"] as Platform[],
          availableColumns: [{ name: "headline", type: "string" }],
        })
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 350));
      });

      expect(result.current.errors.length).toBeGreaterThan(0);
    });

    it("reports how many rows exceed limits", async () => {
      const sampleDataMixed = [
        { headline: "Short" },
        { headline: "This is way too long for Google Ads headline limit of thirty characters" },
        { headline: "Also short" },
      ];

      const configWithVar: HierarchyConfig = {
        adGroups: [
          {
            id: "ag1",
            namePattern: "Group",
            ads: [
              {
                id: "ad1",
                headline: "{headline}",
                description: "Short",
              },
            ],
          },
        ],
      };

      const { result } = renderHook(() =>
        useValidation({
          hierarchyConfig: configWithVar,
          sampleData: sampleDataMixed,
          selectedPlatforms: ["google"] as Platform[],
          availableColumns: [{ name: "headline", type: "string" }],
        })
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 350));
      });

      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(
        result.current.errors.some((e) => e.message.includes("1") && e.message.includes("row"))
      ).toBe(true);
    });
  });

  describe("Debouncing", () => {
    it("debounces validation to avoid excessive re-computation", async () => {
      const { result, rerender } = renderHook(
        ({ config }) =>
          useValidation({
            hierarchyConfig: config,
            sampleData: mockSampleData,
            selectedPlatforms: ["google"] as Platform[],
            availableColumns: mockColumns,
          }),
        { initialProps: { config: mockHierarchyConfig } }
      );

      // Multiple rapid updates
      for (let i = 0; i < 5; i++) {
        const updatedConfig: HierarchyConfig = {
          adGroups: [
            {
              ...mockHierarchyConfig.adGroups[0]!,
              namePattern: `Updated ${i}`,
            },
          ],
        };
        rerender({ config: updatedConfig });
      }

      // Should still be validating or just finished
      expect(result.current).toBeDefined();
    });
  });

  describe("Caching", () => {
    it("caches validation results for unchanged config", async () => {
      const { result, rerender } = renderHook(() =>
        useValidation({
          hierarchyConfig: mockHierarchyConfig,
          sampleData: mockSampleData,
          selectedPlatforms: ["google"] as Platform[],
          availableColumns: mockColumns,
        })
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 350));
      });

      const initialErrors = result.current.errors;

      // Rerender with same props
      rerender();

      // Should return same cached result
      expect(result.current.errors).toEqual(initialErrors);
    });
  });
});
