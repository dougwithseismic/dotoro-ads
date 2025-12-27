import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignSetName } from "../CampaignSetName";

describe("CampaignSetName", () => {
  let onNameChange: ReturnType<typeof vi.fn>;
  let onDescriptionChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onNameChange = vi.fn();
    onDescriptionChange = vi.fn();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders the campaign set name input field", () => {
      render(
        <CampaignSetName
          name=""
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      expect(screen.getByLabelText(/campaign set name/i)).toBeInTheDocument();
    });

    it("renders the description textarea", () => {
      render(
        <CampaignSetName
          name=""
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it("displays the current name value", () => {
      render(
        <CampaignSetName
          name="My Campaign Set"
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      const input = screen.getByLabelText(/campaign set name/i) as HTMLInputElement;
      expect(input.value).toBe("My Campaign Set");
    });

    it("displays the current description value", () => {
      render(
        <CampaignSetName
          name=""
          description="This is my campaign set description"
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      const textarea = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe("This is my campaign set description");
    });

    it("shows optional indicator on description field", () => {
      render(
        <CampaignSetName
          name=""
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      // Description should have optional text indicator next to the label
      const label = screen.getByText(/description/i);
      // Check for the "(optional)" text within the parent
      expect(label.parentElement).toHaveTextContent("(optional)");
    });
  });

  // ==========================================================================
  // Interaction Tests
  // ==========================================================================

  describe("Interactions", () => {
    it("calls onNameChange when typing in name field", async () => {
      const user = userEvent.setup();

      render(
        <CampaignSetName
          name=""
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      const input = screen.getByLabelText(/campaign set name/i);
      await user.type(input, "Test");

      expect(onNameChange).toHaveBeenCalled();
      // Each character triggers a call
      expect(onNameChange).toHaveBeenCalledTimes(4);
    });

    it("calls onDescriptionChange when typing in description field", async () => {
      const user = userEvent.setup();

      render(
        <CampaignSetName
          name=""
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      const textarea = screen.getByLabelText(/description/i);
      await user.type(textarea, "Desc");

      expect(onDescriptionChange).toHaveBeenCalled();
      expect(onDescriptionChange).toHaveBeenCalledTimes(4);
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe("Validation", () => {
    it("displays error message when name is empty after blur", async () => {
      const user = userEvent.setup();

      render(
        <CampaignSetName
          name=""
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      const input = screen.getByLabelText(/campaign set name/i);
      await user.click(input);
      await user.tab(); // Blur the input

      expect(screen.getByText(/campaign set name is required/i)).toBeInTheDocument();
    });

    it("displays error message when name is too short after blur", async () => {
      const user = userEvent.setup();

      render(
        <CampaignSetName
          name="Ab"
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      const input = screen.getByLabelText(/campaign set name/i);
      await user.click(input);
      await user.tab(); // Blur the input

      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
    });

    it("displays error message when name is too long", () => {
      const longName = "a".repeat(256);

      render(
        <CampaignSetName
          name={longName}
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      expect(screen.getByText(/at most 255 characters/i)).toBeInTheDocument();
    });

    it("displays external errors when passed", () => {
      render(
        <CampaignSetName
          name="Valid Name"
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
          errors={["Name already exists", "Server validation failed"]}
        />
      );

      expect(screen.getByText(/name already exists/i)).toBeInTheDocument();
      expect(screen.getByText(/server validation failed/i)).toBeInTheDocument();
    });

    it("clears internal errors when name becomes valid", async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <CampaignSetName
          name="Ab"
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      const input = screen.getByLabelText(/campaign set name/i);
      await user.click(input);
      await user.tab(); // Blur to show error

      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();

      // Rerender with valid name
      rerender(
        <CampaignSetName
          name="Abc"
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      expect(screen.queryByText(/at least 3 characters/i)).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Character Count Tests
  // ==========================================================================

  describe("Character Count", () => {
    it("displays character count for name field", () => {
      render(
        <CampaignSetName
          name="Test Name"
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      expect(screen.getByText(/9 \/ 255/)).toBeInTheDocument();
    });

    it("displays character count for empty name", () => {
      render(
        <CampaignSetName
          name=""
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      expect(screen.getByText(/0 \/ 255/)).toBeInTheDocument();
    });

    it("updates character count when name changes", async () => {
      const { rerender } = render(
        <CampaignSetName
          name=""
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      expect(screen.getByText(/0 \/ 255/)).toBeInTheDocument();

      rerender(
        <CampaignSetName
          name="Hello"
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      expect(screen.getByText(/5 \/ 255/)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      render(
        <CampaignSetName
          name=""
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      const nameInput = screen.getByLabelText(/campaign set name/i);
      expect(nameInput).toHaveAttribute("aria-describedby");

      const descInput = screen.getByLabelText(/description/i);
      expect(descInput).toHaveAttribute("aria-describedby");
    });

    it("marks name input as invalid when there are errors", async () => {
      const user = userEvent.setup();

      render(
        <CampaignSetName
          name=""
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      const input = screen.getByLabelText(/campaign set name/i);
      await user.click(input);
      await user.tab(); // Blur to trigger validation

      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();

      render(
        <CampaignSetName
          name="Valid Name"
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      // Tab to name input
      await user.tab();
      expect(screen.getByLabelText(/campaign set name/i)).toHaveFocus();

      // Tab to description
      await user.tab();
      expect(screen.getByLabelText(/description/i)).toHaveFocus();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles very long description", () => {
      const longDescription = "a".repeat(1000);

      render(
        <CampaignSetName
          name="Valid Name"
          description={longDescription}
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      const textarea = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe(longDescription);
    });

    it("handles special characters in name", async () => {
      const user = userEvent.setup();

      render(
        <CampaignSetName
          name=""
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      const input = screen.getByLabelText(/campaign set name/i);
      await user.type(input, "Test & Campaign <2024>");

      // Should handle special characters without issues
      expect(onNameChange).toHaveBeenCalled();
    });

    it("handles rapid input changes", async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <CampaignSetName
          name=""
          description=""
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      );

      const input = screen.getByLabelText(/campaign set name/i);
      await user.type(input, "Rapid typing test 1234567890");

      expect(onNameChange).toHaveBeenCalled();
    });
  });
});
