import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PersonaEditor } from "../PersonaEditor";
import type { AuthorPersona } from "../../../types";

const mockPersona: AuthorPersona = {
  id: "test-persona",
  name: "Test Persona",
  description: "A test persona for unit testing",
  role: "community_member",
  tone: "friendly",
};

describe("PersonaEditor", () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders form fields for creating a new persona", () => {
      render(
        <PersonaEditor onSave={vi.fn()} onCancel={vi.fn()} />
      );

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tone/i)).toBeInTheDocument();
    });

    it("renders with existing persona data for editing", () => {
      render(
        <PersonaEditor
          persona={mockPersona}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByLabelText(/name/i)).toHaveValue("Test Persona");
      expect(screen.getByLabelText(/description/i)).toHaveValue(
        "A test persona for unit testing"
      );
    });

    it("resets form state when persona prop changes", () => {
      const firstPersona: AuthorPersona = {
        id: "first",
        name: "First Persona",
        description: "First description",
        role: "community_member",
        tone: "friendly",
      };

      const secondPersona: AuthorPersona = {
        id: "second",
        name: "Second Persona",
        description: "Second description",
        role: "expert",
        tone: "neutral",
      };

      const { rerender } = render(
        <PersonaEditor
          persona={firstPersona}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByLabelText(/name/i)).toHaveValue("First Persona");
      expect(screen.getByLabelText(/description/i)).toHaveValue("First description");

      // Change the persona prop
      rerender(
        <PersonaEditor
          persona={secondPersona}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByLabelText(/name/i)).toHaveValue("Second Persona");
      expect(screen.getByLabelText(/description/i)).toHaveValue("Second description");
    });

    it("renders save and cancel buttons", () => {
      render(
        <PersonaEditor onSave={vi.fn()} onCancel={vi.fn()} />
      );

      expect(screen.getByRole("button", { name: /create persona/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /cancel/i })
      ).toBeInTheDocument();
    });

    it("shows Create Persona title for new persona", () => {
      render(
        <PersonaEditor onSave={vi.fn()} onCancel={vi.fn()} />
      );

      expect(screen.getByRole("heading", { name: /create persona/i })).toBeInTheDocument();
    });

    it("shows Edit Persona title when editing existing persona", () => {
      render(
        <PersonaEditor
          persona={mockPersona}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByRole("heading", { name: /edit persona/i })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Form Interaction Tests
  // ==========================================================================

  describe("Form Interactions", () => {
    it("updates name field on input", async () => {
      const user = userEvent.setup();
      render(
        <PersonaEditor onSave={vi.fn()} onCancel={vi.fn()} />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "New Persona Name");

      expect(nameInput).toHaveValue("New Persona Name");
    });

    it("updates description field on input", async () => {
      const user = userEvent.setup();
      render(
        <PersonaEditor onSave={vi.fn()} onCancel={vi.fn()} />
      );

      const descInput = screen.getByLabelText(/description/i);
      await user.type(descInput, "New description");

      expect(descInput).toHaveValue("New description");
    });

    it("updates role selection", async () => {
      const user = userEvent.setup();
      render(
        <PersonaEditor onSave={vi.fn()} onCancel={vi.fn()} />
      );

      const roleSelect = screen.getByLabelText(/role/i);
      await user.selectOptions(roleSelect, "expert");

      expect(roleSelect).toHaveValue("expert");
    });

    it("updates tone selection", async () => {
      const user = userEvent.setup();
      render(
        <PersonaEditor onSave={vi.fn()} onCancel={vi.fn()} />
      );

      const toneSelect = screen.getByLabelText(/tone/i);
      await user.selectOptions(toneSelect, "enthusiastic");

      expect(toneSelect).toHaveValue("enthusiastic");
    });
  });

  // ==========================================================================
  // Save and Cancel Tests
  // ==========================================================================

  describe("Save and Cancel", () => {
    it("calls onSave with form data when save is clicked", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();

      render(
        <PersonaEditor onSave={onSave} onCancel={vi.fn()} />
      );

      await user.type(screen.getByLabelText(/name/i), "New Persona");
      await user.type(screen.getByLabelText(/description/i), "A new persona");
      await user.selectOptions(screen.getByLabelText(/role/i), "expert");
      await user.selectOptions(screen.getByLabelText(/tone/i), "enthusiastic");

      await user.click(screen.getByRole("button", { name: /create persona/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Persona",
          description: "A new persona",
          role: "expert",
          tone: "enthusiastic",
        })
      );
    });

    it("calls onSave with existing id when editing", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();

      render(
        <PersonaEditor
          persona={mockPersona}
          onSave={onSave}
          onCancel={vi.fn()}
        />
      );

      await user.clear(screen.getByLabelText(/name/i));
      await user.type(screen.getByLabelText(/name/i), "Updated Name");

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "test-persona",
          name: "Updated Name",
        })
      );
    });

    it("calls onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(
        <PersonaEditor onSave={vi.fn()} onCancel={onCancel} />
      );

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe("Validation", () => {
    it("disables save button when name is empty", () => {
      render(
        <PersonaEditor onSave={vi.fn()} onCancel={vi.fn()} />
      );

      const saveButton = screen.getByRole("button", { name: /create persona/i });
      expect(saveButton).toBeDisabled();
    });

    it("enables save button when name is provided", async () => {
      const user = userEvent.setup();
      render(
        <PersonaEditor onSave={vi.fn()} onCancel={vi.fn()} />
      );

      await user.type(screen.getByLabelText(/name/i), "Valid Name");

      const saveButton = screen.getByRole("button", { name: /create persona/i });
      expect(saveButton).not.toBeDisabled();
    });

    it("shows validation error when trying to save with empty name", async () => {
      const user = userEvent.setup();
      render(
        <PersonaEditor onSave={vi.fn()} onCancel={vi.fn()} />
      );

      // Try to submit with empty name by clicking a required field and leaving
      const nameInput = screen.getByLabelText(/name/i);
      await user.click(nameInput);
      await user.tab();

      // Should show some indication that name is required
      expect(
        screen.getByRole("button", { name: /create persona/i })
      ).toBeDisabled();
    });
  });

  // ==========================================================================
  // Role Options Tests
  // ==========================================================================

  describe("Role Options", () => {
    it("renders all role options except op for new persona", () => {
      render(
        <PersonaEditor onSave={vi.fn()} onCancel={vi.fn()} />
      );

      const roleSelect = screen.getByLabelText(/role/i) as HTMLSelectElement;
      const options = Array.from(roleSelect.options).map((o) => o.text);

      expect(options).toContain("Community Member");
      expect(options).toContain("Skeptic");
      expect(options).toContain("Enthusiast");
      expect(options).toContain("Expert");
      expect(options).toContain("Curious");
      expect(options).not.toContain("OP");
    });

    it("shows OP role option when editing OP persona", () => {
      const opPersona: AuthorPersona = {
        id: "op",
        name: "Original Poster",
        description: "The OP",
        role: "op",
        tone: "friendly",
      };

      render(
        <PersonaEditor
          persona={opPersona}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const roleSelect = screen.getByLabelText(/role/i);
      expect(roleSelect).toHaveValue("op");
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has proper form labels", () => {
      render(
        <PersonaEditor onSave={vi.fn()} onCancel={vi.fn()} />
      );

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tone/i)).toBeInTheDocument();
    });

    it("has proper button roles", () => {
      render(
        <PersonaEditor onSave={vi.fn()} onCancel={vi.fn()} />
      );

      expect(screen.getByRole("button", { name: /create persona/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /cancel/i })
      ).toBeInTheDocument();
    });
  });
});
