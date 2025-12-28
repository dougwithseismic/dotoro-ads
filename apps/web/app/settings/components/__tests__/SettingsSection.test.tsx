import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SettingsSection } from "../SettingsSection";

describe("SettingsSection", () => {
  describe("Rendering", () => {
    it("should render section title", () => {
      render(
        <SettingsSection title="Account Information">
          <div>Content</div>
        </SettingsSection>
      );

      expect(screen.getByRole("heading", { name: /account information/i })).toBeInTheDocument();
    });

    it("should render section description when provided", () => {
      render(
        <SettingsSection
          title="Account Information"
          description="Manage your account details and preferences."
        >
          <div>Content</div>
        </SettingsSection>
      );

      expect(screen.getByText(/manage your account details/i)).toBeInTheDocument();
    });

    it("should not render description when not provided", () => {
      render(
        <SettingsSection title="Account Information">
          <div>Content</div>
        </SettingsSection>
      );

      // Description paragraph should not exist
      const paragraphs = screen.queryAllByRole("paragraph");
      expect(paragraphs.filter((p) => p.textContent?.includes("account"))).toHaveLength(0);
    });

    it("should render children content", () => {
      render(
        <SettingsSection title="Test Section">
          <div data-testid="section-content">Section Content</div>
        </SettingsSection>
      );

      expect(screen.getByTestId("section-content")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should have border styling by default", () => {
      render(
        <SettingsSection title="Test Section">
          <div>Content</div>
        </SettingsSection>
      );

      const section = screen.getByTestId("settings-section");
      expect(section).toHaveClass("border");
    });

    it("should have rounded corners", () => {
      render(
        <SettingsSection title="Test Section">
          <div>Content</div>
        </SettingsSection>
      );

      const section = screen.getByTestId("settings-section");
      expect(section).toHaveClass("rounded-lg");
    });
  });

  describe("Danger Variant", () => {
    it("should apply danger styling when variant is danger", () => {
      render(
        <SettingsSection title="Danger Zone" variant="danger">
          <div>Dangerous content</div>
        </SettingsSection>
      );

      const section = screen.getByTestId("settings-section");
      expect(section).toHaveClass("border-red-200");
    });

    it("should have red background for danger variant", () => {
      render(
        <SettingsSection title="Danger Zone" variant="danger">
          <div>Dangerous content</div>
        </SettingsSection>
      );

      const section = screen.getByTestId("settings-section");
      expect(section).toHaveClass("bg-red-50");
    });
  });

  describe("Accessibility", () => {
    it("should use section element for semantic structure", () => {
      render(
        <SettingsSection title="Test Section">
          <div>Content</div>
        </SettingsSection>
      );

      expect(screen.getByTestId("settings-section").tagName).toBe("SECTION");
    });

    it("should use proper heading level", () => {
      render(
        <SettingsSection title="Test Section">
          <div>Content</div>
        </SettingsSection>
      );

      // Default heading level should be h2 within settings page context
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    it("should allow custom heading level", () => {
      render(
        <SettingsSection title="Test Section" headingLevel={3}>
          <div>Content</div>
        </SettingsSection>
      );

      expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    });
  });

  describe("Custom ClassName", () => {
    it("should allow custom className", () => {
      render(
        <SettingsSection title="Test Section" className="custom-class">
          <div>Content</div>
        </SettingsSection>
      );

      const section = screen.getByTestId("settings-section");
      expect(section).toHaveClass("custom-class");
    });
  });
});
