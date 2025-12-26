import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PersonaManager } from "../PersonaManager";
import type { AuthorPersona } from "../../../types";
import { DEFAULT_PERSONAS } from "../../../types";

describe("PersonaManager", () => {
  const defaultPersonas = [...DEFAULT_PERSONAS];

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders list of personas", () => {
      render(
        <PersonaManager
          personas={defaultPersonas}
          onAdd={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // Check that persona cards are rendered
      expect(screen.getByTestId("persona-card-op")).toBeInTheDocument();
      expect(screen.getByTestId("persona-card-curious")).toBeInTheDocument();
      expect(screen.getByTestId("persona-card-skeptic")).toBeInTheDocument();
      expect(screen.getByTestId("persona-card-enthusiast")).toBeInTheDocument();
    });

    it("renders add persona button", () => {
      render(
        <PersonaManager
          personas={defaultPersonas}
          onAdd={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(
        screen.getByRole("button", { name: /add persona/i })
      ).toBeInTheDocument();
    });

    it("renders section title", () => {
      render(
        <PersonaManager
          personas={defaultPersonas}
          onAdd={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText(/personas/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Add Persona Flow Tests
  // ==========================================================================

  describe("Add Persona Flow", () => {
    it("shows editor when add button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <PersonaManager
          personas={defaultPersonas}
          onAdd={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: /add persona/i }));

      expect(screen.getByTestId("persona-editor")).toBeInTheDocument();
    });

    it("calls onAdd when new persona is saved", async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();

      render(
        <PersonaManager
          personas={defaultPersonas}
          onAdd={onAdd}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: /add persona/i }));
      await user.type(screen.getByLabelText(/name/i), "New Persona");
      await user.click(
        screen.getByRole("button", { name: /create persona/i })
      );

      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Persona" })
      );
    });

    it("hides editor when cancel is clicked", async () => {
      const user = userEvent.setup();

      render(
        <PersonaManager
          personas={defaultPersonas}
          onAdd={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: /add persona/i }));
      expect(screen.getByTestId("persona-editor")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(screen.queryByTestId("persona-editor")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edit Persona Flow Tests
  // ==========================================================================

  describe("Edit Persona Flow", () => {
    it("shows editor with persona data when edit is clicked", async () => {
      const user = userEvent.setup();

      render(
        <PersonaManager
          personas={defaultPersonas}
          onAdd={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      await user.click(editButtons[0]); // Edit first persona

      expect(screen.getByTestId("persona-editor")).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toHaveValue("Original Poster");
    });

    it("calls onUpdate when edited persona is saved", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();

      render(
        <PersonaManager
          personas={defaultPersonas}
          onAdd={vi.fn()}
          onUpdate={onUpdate}
          onDelete={vi.fn()}
        />
      );

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      await user.click(editButtons[1]); // Edit second persona

      await user.clear(screen.getByLabelText(/name/i));
      await user.type(screen.getByLabelText(/name/i), "Updated Name");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(onUpdate).toHaveBeenCalledWith(
        "curious",
        expect.objectContaining({ name: "Updated Name" })
      );
    });
  });

  // ==========================================================================
  // Delete Persona Tests
  // ==========================================================================

  describe("Delete Persona", () => {
    it("calls onDelete when delete is clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();

      render(
        <PersonaManager
          personas={defaultPersonas}
          onAdd={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={onDelete}
        />
      );

      // Find delete button (not on OP)
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(onDelete).toHaveBeenCalled();
    });

    it("does not show delete button for OP persona", () => {
      render(
        <PersonaManager
          personas={defaultPersonas}
          onAdd={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // OP card should not have delete button
      const opCard = screen.getByTestId("persona-card-op");
      expect(
        opCard.querySelector('button[aria-label*="Delete"]')
      ).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Empty State Tests
  // ==========================================================================

  describe("Empty State", () => {
    it("shows appropriate message when no personas exist", () => {
      render(
        <PersonaManager
          personas={[]}
          onAdd={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText(/no personas/i)).toBeInTheDocument();
    });
  });
});
