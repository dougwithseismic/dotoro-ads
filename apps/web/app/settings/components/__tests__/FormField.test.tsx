import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FormField } from "../FormField";

describe("FormField", () => {
  const user = userEvent.setup();

  const defaultProps = {
    id: "test-field",
    label: "Email",
    type: "email" as const,
    value: "",
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render label", () => {
      render(<FormField {...defaultProps} />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it("should render input with correct type", () => {
      render(<FormField {...defaultProps} type="email" />);

      expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
    });

    it("should render text input by default", () => {
      render(<FormField {...defaultProps} type="text" />);

      expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");
    });

    it("should render with placeholder", () => {
      render(<FormField {...defaultProps} placeholder="Enter your email" />);

      expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    });

    it("should display current value", () => {
      render(<FormField {...defaultProps} value="test@example.com" />);

      expect(screen.getByRole("textbox")).toHaveValue("test@example.com");
    });
  });

  describe("Input Types", () => {
    it("should render text input", () => {
      render(<FormField {...defaultProps} type="text" label="Name" />);

      expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");
    });

    it("should render email input", () => {
      render(<FormField {...defaultProps} type="email" />);

      expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
    });

    it("should render toggle input", () => {
      render(
        <FormField
          {...defaultProps}
          type="toggle"
          label="Enable notifications"
          checked={false}
          onCheckedChange={vi.fn()}
        />
      );

      expect(screen.getByRole("switch")).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should call onChange when input value changes", async () => {
      render(<FormField {...defaultProps} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "test");

      expect(defaultProps.onChange).toHaveBeenCalled();
    });

    it("should call onCheckedChange when toggle is clicked", async () => {
      const onCheckedChange = vi.fn();
      render(
        <FormField
          {...defaultProps}
          type="toggle"
          label="Enable notifications"
          checked={false}
          onCheckedChange={onCheckedChange}
        />
      );

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });
  });

  describe("Error State", () => {
    it("should display error message when provided", () => {
      render(<FormField {...defaultProps} error="Invalid email address" />);

      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });

    it("should apply error styling to input when error exists", () => {
      render(<FormField {...defaultProps} error="Invalid email" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-red-500");
    });

    it("should associate error message with input via aria-describedby", () => {
      render(<FormField {...defaultProps} error="Invalid email" />);

      const input = screen.getByRole("textbox");
      const errorId = input.getAttribute("aria-describedby");
      expect(errorId).toBeTruthy();
      expect(document.getElementById(errorId!)).toHaveTextContent("Invalid email");
    });

    it("should mark input as invalid when error exists", () => {
      render(<FormField {...defaultProps} error="Invalid email" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("Disabled State", () => {
    it("should disable input when disabled prop is true", () => {
      render(<FormField {...defaultProps} disabled />);

      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("should disable toggle when disabled prop is true", () => {
      render(
        <FormField
          {...defaultProps}
          type="toggle"
          label="Test toggle"
          checked={false}
          onCheckedChange={vi.fn()}
          disabled
        />
      );

      expect(screen.getByRole("switch")).toBeDisabled();
    });

    it("should apply disabled styling", () => {
      render(<FormField {...defaultProps} disabled />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("disabled:opacity-50");
    });
  });

  describe("Required State", () => {
    it("should mark input as required when required prop is true", () => {
      render(<FormField {...defaultProps} required />);

      expect(screen.getByRole("textbox")).toBeRequired();
    });

    it("should show required indicator in label", () => {
      render(<FormField {...defaultProps} required />);

      expect(screen.getByText("*")).toBeInTheDocument();
    });
  });

  describe("Helper Text", () => {
    it("should display helper text when provided", () => {
      render(<FormField {...defaultProps} helperText="We will never share your email." />);

      expect(screen.getByText(/we will never share/i)).toBeInTheDocument();
    });

    it("should not display helper text when error is present", () => {
      render(
        <FormField
          {...defaultProps}
          helperText="We will never share your email."
          error="Invalid email"
        />
      );

      expect(screen.queryByText(/we will never share/i)).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper label association", () => {
      render(<FormField {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("id", "test-field");
      expect(screen.getByLabelText(/email/i)).toBe(input);
    });

    it("should have proper aria attributes for toggle", () => {
      render(
        <FormField
          {...defaultProps}
          type="toggle"
          label="Enable notifications"
          checked={true}
          onCheckedChange={vi.fn()}
        />
      );

      const toggle = screen.getByRole("switch");
      expect(toggle).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("Max Length", () => {
    it("should respect maxLength attribute", () => {
      render(<FormField {...defaultProps} maxLength={100} />);

      expect(screen.getByRole("textbox")).toHaveAttribute("maxLength", "100");
    });
  });
});
