import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PersonaCard } from "../PersonaCard";
import type { AuthorPersona } from "../../../types";

const mockPersona: AuthorPersona = {
  id: "test-persona",
  name: "Test Persona",
  description: "A test persona for unit testing",
  role: "community_member",
  tone: "friendly",
};

const opPersona: AuthorPersona = {
  id: "op",
  name: "Original Poster",
  description: "The person who created the thread",
  role: "op",
  tone: "friendly",
};

describe("PersonaCard", () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders persona name", () => {
      render(
        <PersonaCard
          persona={mockPersona}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("Test Persona")).toBeInTheDocument();
    });

    it("renders persona description", () => {
      render(
        <PersonaCard
          persona={mockPersona}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(
        screen.getByText("A test persona for unit testing")
      ).toBeInTheDocument();
    });

    it("renders persona role", () => {
      render(
        <PersonaCard
          persona={mockPersona}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText(/community member/i)).toBeInTheDocument();
    });

    it("renders persona tone when provided", () => {
      render(
        <PersonaCard
          persona={mockPersona}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText(/friendly/i)).toBeInTheDocument();
    });

    it("renders Default badge for OP persona", () => {
      render(
        <PersonaCard persona={opPersona} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      expect(screen.getByText("Default")).toBeInTheDocument();
    });

    it("does not render Default badge for non-OP personas", () => {
      render(
        <PersonaCard
          persona={mockPersona}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.queryByText("Default")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Interaction Tests
  // ==========================================================================

  describe("Interactions", () => {
    it("calls onEdit when edit button is clicked", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      render(
        <PersonaCard persona={mockPersona} onEdit={onEdit} onDelete={vi.fn()} />
      );

      await user.click(screen.getByRole("button", { name: /edit/i }));
      expect(onEdit).toHaveBeenCalledWith(mockPersona);
    });

    it("calls onDelete when delete button is clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();

      render(
        <PersonaCard
          persona={mockPersona}
          onEdit={vi.fn()}
          onDelete={onDelete}
        />
      );

      await user.click(screen.getByRole("button", { name: /delete/i }));
      expect(onDelete).toHaveBeenCalledWith(mockPersona.id);
    });

    it("disables delete button for OP persona", () => {
      render(
        <PersonaCard persona={opPersona} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      const deleteButton = screen.queryByRole("button", { name: /delete/i });
      expect(deleteButton).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Role Display Tests
  // ==========================================================================

  describe("Role Display", () => {
    const roles: Array<{ role: AuthorPersona["role"]; display: string }> = [
      { role: "op", display: "OP" },
      { role: "community_member", display: "Community Member" },
      { role: "skeptic", display: "Skeptic" },
      { role: "enthusiast", display: "Enthusiast" },
      { role: "expert", display: "Expert" },
      { role: "curious", display: "Curious" },
      { role: "moderator", display: "Moderator" },
    ];

    roles.forEach(({ role, display }) => {
      it(`displays correct label for ${role} role`, () => {
        const persona: AuthorPersona = {
          ...mockPersona,
          role,
        };

        render(
          <PersonaCard persona={persona} onEdit={vi.fn()} onDelete={vi.fn()} />
        );

        expect(screen.getByText(new RegExp(display, "i"))).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Tone Display Tests
  // ==========================================================================

  describe("Tone Display", () => {
    const tones: Array<{ tone: AuthorPersona["tone"]; display: string }> = [
      { tone: "friendly", display: "Friendly" },
      { tone: "skeptical", display: "Skeptical" },
      { tone: "enthusiastic", display: "Enthusiastic" },
      { tone: "neutral", display: "Neutral" },
      { tone: "curious", display: "Curious" },
    ];

    tones.forEach(({ tone, display }) => {
      it(`displays correct label for ${tone} tone`, () => {
        const persona: AuthorPersona = {
          ...mockPersona,
          tone,
        };

        render(
          <PersonaCard persona={persona} onEdit={vi.fn()} onDelete={vi.fn()} />
        );

        expect(screen.getByText(new RegExp(display, "i"))).toBeInTheDocument();
      });
    });

    it("handles undefined tone gracefully", () => {
      const personaWithoutTone: AuthorPersona = {
        id: "no-tone",
        name: "No Tone Persona",
        description: "A persona without a tone",
        role: "community_member",
      };

      render(
        <PersonaCard
          persona={personaWithoutTone}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("No Tone Persona")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has accessible buttons", () => {
      render(
        <PersonaCard
          persona={mockPersona}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(
        screen.getByRole("button", { name: /edit/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /delete/i })
      ).toBeInTheDocument();
    });

    it("provides appropriate aria-label for persona card", () => {
      render(
        <PersonaCard
          persona={mockPersona}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const card = screen.getByRole("article");
      expect(card).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Test Persona")
      );
    });
  });
});
