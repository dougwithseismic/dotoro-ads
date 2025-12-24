import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorBoundary, withErrorBoundary } from "../ErrorBoundary";

// Component that throws an error
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>Child content rendered successfully</div>;
}

// Component that throws with stack trace
function ThrowingComponentWithStack() {
  const error = new Error("Detailed error");
  error.stack = "Error: Detailed error\n    at ThrowingComponentWithStack";
  throw error;
}

describe("ErrorBoundary", () => {
  // Suppress console.error during tests since we expect errors
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // ==========================================================================
  // Test: Renders children when no error
  // ==========================================================================
  describe("when no error occurs", () => {
    it("renders children when no error", () => {
      render(
        <ErrorBoundary>
          <div>Test child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText("Test child content")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText("First child")).toBeInTheDocument();
      expect(screen.getByText("Second child")).toBeInTheDocument();
    });

    it("renders component children that do not throw", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Child content rendered successfully")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Test: Catches errors and displays fallback UI
  // ==========================================================================
  describe("when an error occurs", () => {
    it("catches errors and displays fallback UI", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Should display the default error UI
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(
        screen.getByText("An unexpected error occurred. Please try again.")
      ).toBeInTheDocument();
    });

    it("displays custom error message when provided", () => {
      render(
        <ErrorBoundary errorMessage="Custom error message for the user">
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText("Custom error message for the user")).toBeInTheDocument();
    });

    it("shows Try Again button in error UI", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole("button", { name: /retry loading the content/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveTextContent("Try Again");
    });

    it("has proper accessibility attributes", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });
  });

  // ==========================================================================
  // Test: Calls onError callback with error info
  // ==========================================================================
  describe("onError callback", () => {
    it("calls onError callback with error info", () => {
      const onErrorMock = vi.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Test error message",
        }),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it("does not call onError when no error occurs", () => {
      const onErrorMock = vi.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(onErrorMock).not.toHaveBeenCalled();
    });

    it("logs error to console", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error caught by ErrorBoundary:",
        expect.objectContaining({ message: "Test error message" }),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });
  });

  // ==========================================================================
  // Test: Allows retry via Try Again button
  // ==========================================================================
  describe("retry functionality", () => {
    it("allows retry via Try Again button", () => {
      // Use a ref-like pattern to control throwing behavior
      const throwControl = { shouldThrow: true };

      function ConditionalThrowComponent() {
        if (throwControl.shouldThrow) {
          throw new Error("First render error");
        }
        return <div>Recovery successful</div>;
      }

      render(
        <ErrorBoundary>
          <ConditionalThrowComponent />
        </ErrorBoundary>
      );

      // Initially shows error UI
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();

      // Disable throwing before clicking retry
      throwControl.shouldThrow = false;

      // Click Try Again
      const retryButton = screen.getByRole("button", { name: /retry loading the content/i });
      fireEvent.click(retryButton);

      // After retry, should render recovered content
      expect(screen.getByText("Recovery successful")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("resets error state when Try Again is clicked", () => {
      const onErrorMock = vi.fn();
      let shouldThrow = true;

      function ToggleThrowComponent() {
        if (shouldThrow) {
          throw new Error("Toggleable error");
        }
        return <div>Content after recovery</div>;
      }

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ToggleThrowComponent />
        </ErrorBoundary>
      );

      // Error occurred once
      expect(onErrorMock).toHaveBeenCalledTimes(1);

      // Fix the error condition
      shouldThrow = false;

      // Click Try Again
      fireEvent.click(screen.getByRole("button", { name: /retry loading the content/i }));

      // Should now show the recovered content
      expect(screen.getByText("Content after recovery")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Test: Shows error details in development mode
  // ==========================================================================
  describe("error details in development mode", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      // Restore original NODE_ENV
      vi.stubEnv("NODE_ENV", originalNodeEnv as string);
    });

    it("shows error details in development mode", () => {
      vi.stubEnv("NODE_ENV", "development");

      render(
        <ErrorBoundary>
          <ThrowingComponentWithStack />
        </ErrorBoundary>
      );

      // Should have a details/summary for error details
      const summary = screen.getByText("Error Details (Development Only)");
      expect(summary).toBeInTheDocument();

      // Expand details
      fireEvent.click(summary);

      // Should show error message and stack
      expect(screen.getByText(/Detailed error/)).toBeInTheDocument();
    });

    it("hides error details in production mode", () => {
      vi.stubEnv("NODE_ENV", "production");

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Should NOT show the development-only error details
      expect(screen.queryByText("Error Details (Development Only)")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Test: Uses custom fallback when provided
  // ==========================================================================
  describe("custom fallback", () => {
    it("uses custom fallback when provided", () => {
      const customFallback = (
        <div data-testid="custom-fallback">
          <h3>Custom Error UI</h3>
          <p>Something broke, try again later</p>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Should show custom fallback
      expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
      expect(screen.getByText("Custom Error UI")).toBeInTheDocument();
      expect(screen.getByText("Something broke, try again later")).toBeInTheDocument();

      // Should NOT show default error UI
      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    });

    it("prefers custom fallback over errorMessage prop", () => {
      const customFallback = <div>Custom fallback takes precedence</div>;

      render(
        <ErrorBoundary fallback={customFallback} errorMessage="This should not appear">
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText("Custom fallback takes precedence")).toBeInTheDocument();
      expect(screen.queryByText("This should not appear")).not.toBeInTheDocument();
    });
  });
});

// ==========================================================================
// Test: withErrorBoundary HOC works correctly
// ==========================================================================
describe("withErrorBoundary HOC", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("wraps component with error boundary", () => {
    function MyComponent() {
      return <div>My component content</div>;
    }

    const WrappedComponent = withErrorBoundary(MyComponent);

    render(<WrappedComponent />);

    expect(screen.getByText("My component content")).toBeInTheDocument();
  });

  it("catches errors from wrapped component", () => {
    function FailingComponent() {
      throw new Error("HOC test error");
    }

    const WrappedComponent = withErrorBoundary(FailingComponent);

    render(<WrappedComponent />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("passes error boundary props to the wrapper", () => {
    function FailingComponent() {
      throw new Error("HOC props test");
    }

    const onErrorMock = vi.fn();
    const WrappedComponent = withErrorBoundary(FailingComponent, {
      errorMessage: "Custom HOC error message",
      onError: onErrorMock,
    });

    render(<WrappedComponent />);

    expect(screen.getByText("Custom HOC error message")).toBeInTheDocument();
    expect(onErrorMock).toHaveBeenCalled();
  });

  it("passes props to the wrapped component", () => {
    interface GreetingProps {
      name: string;
    }

    function Greeting({ name }: GreetingProps) {
      return <div>Hello, {name}!</div>;
    }

    const WrappedGreeting = withErrorBoundary(Greeting);

    render(<WrappedGreeting name="World" />);

    expect(screen.getByText("Hello, World!")).toBeInTheDocument();
  });

  it("sets correct displayName on wrapped component", () => {
    function MyNamedComponent() {
      return <div>Named</div>;
    }

    const WrappedComponent = withErrorBoundary(MyNamedComponent);

    expect(WrappedComponent.displayName).toBe("withErrorBoundary(MyNamedComponent)");
  });

  it("handles anonymous components in displayName", () => {
    const AnonymousComponent = () => <div>Anonymous</div>;
    // Remove the auto-assigned name
    Object.defineProperty(AnonymousComponent, "name", { value: "" });

    const WrappedComponent = withErrorBoundary(AnonymousComponent);

    expect(WrappedComponent.displayName).toBe("withErrorBoundary(Component)");
  });

  it("uses custom fallback from props", () => {
    function FailingComponent() {
      throw new Error("Fallback test");
    }

    const customFallback = <div data-testid="hoc-fallback">HOC Custom Fallback</div>;
    const WrappedComponent = withErrorBoundary(FailingComponent, {
      fallback: customFallback,
    });

    render(<WrappedComponent />);

    expect(screen.getByTestId("hoc-fallback")).toBeInTheDocument();
    expect(screen.getByText("HOC Custom Fallback")).toBeInTheDocument();
  });
});
