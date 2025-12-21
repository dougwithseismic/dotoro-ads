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
  const mockSetTheme = vi.fn();
  const mockUseTheme = useNextTheme as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetTheme.mockClear();
    mockUseTheme.mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      resolvedTheme: "light",
      themes: ["light", "dark", "system"],
    });
  });

  it("renders toggle button", () => {
    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });

  it("shows sun icon in light mode", () => {
    mockUseTheme.mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      resolvedTheme: "light",
      themes: ["light", "dark", "system"],
    });

    const { container } = render(<ThemeToggle />);
    // Should have sun icon visible
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("toggles to dark mode when clicked in light mode", () => {
    mockUseTheme.mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      resolvedTheme: "light",
      themes: ["light", "dark", "system"],
    });

    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    fireEvent.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("toggles to light mode when clicked in dark mode", () => {
    mockUseTheme.mockReturnValue({
      theme: "dark",
      setTheme: mockSetTheme,
      resolvedTheme: "dark",
      themes: ["light", "dark", "system"],
    });

    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    fireEvent.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("has proper accessibility label", () => {
    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    expect(button).toHaveAttribute("aria-label");
  });
});

describe("useTheme hook", () => {
  it("re-exports useTheme from next-themes", () => {
    // This test verifies the hook is properly exported
    expect(typeof useTheme).toBe("function");
  });
});
