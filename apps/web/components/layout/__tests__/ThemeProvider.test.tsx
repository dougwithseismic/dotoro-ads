import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ThemeProvider, useTheme, ThemeToggle } from "../ThemeProvider";

// Mock next-themes
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: vi.fn(() => ({
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
    themes: ["light", "dark", "system"],
  })),
}));

import { useTheme as useNextTheme } from "next-themes";

describe("ThemeProvider", () => {
  it("renders children", () => {
    render(
      <ThemeProvider>
        <div>Test content</div>
      </ThemeProvider>
    );

    expect(screen.getByText("Test content")).toBeInTheDocument();
  });
});

describe("ThemeToggle", () => {
  // ThemeToggle is currently disabled (returns null) because theme is forced to dark.
  // These tests verify the component behaves correctly in its disabled state.
  it("renders nothing when theme toggle is disabled", () => {
    const { container } = render(<ThemeToggle />);
    expect(container.firstChild).toBeNull();
  });
});

describe("useTheme hook", () => {
  it("re-exports useTheme from next-themes", () => {
    // This test verifies the hook is properly exported
    expect(typeof useTheme).toBe("function");
  });
});
