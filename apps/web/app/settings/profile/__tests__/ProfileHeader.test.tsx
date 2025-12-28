import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileHeader } from "../components/ProfileHeader";

describe("ProfileHeader", () => {
  describe("Avatar Display", () => {
    it("should display user avatar image when image URL is provided", () => {
      render(
        <ProfileHeader
          name="John Doe"
          email="john@example.com"
          image="https://example.com/avatar.jpg"
        />
      );

      const avatar = screen.getByRole("img", { name: /john doe's avatar/i });
      expect(avatar).toBeInTheDocument();
      // Next.js Image uses srcset, so we check that the src contains the image URL
      expect(avatar.getAttribute("src")).toContain("avatar.jpg");
    });

    it("should display initials when no image URL is provided", () => {
      render(
        <ProfileHeader
          name="John Doe"
          email="john@example.com"
          image={null}
        />
      );

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("should display single initial for single-word name", () => {
      render(
        <ProfileHeader
          name="John"
          email="john@example.com"
          image={null}
        />
      );

      expect(screen.getByText("J")).toBeInTheDocument();
    });

    it("should display email initial when name is empty", () => {
      render(
        <ProfileHeader
          name=""
          email="john@example.com"
          image={null}
        />
      );

      expect(screen.getByText("J")).toBeInTheDocument();
    });

    it("should handle undefined name gracefully", () => {
      render(
        <ProfileHeader
          name={undefined}
          email="john@example.com"
          image={null}
        />
      );

      expect(screen.getByText("J")).toBeInTheDocument();
    });
  });

  describe("Name Display", () => {
    it("should display user name prominently", () => {
      render(
        <ProfileHeader
          name="John Doe"
          email="john@example.com"
          image={null}
        />
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should display email as name when name is not provided", () => {
      render(
        <ProfileHeader
          name=""
          email="john@example.com"
          image={null}
        />
      );

      // When no name, should show email as the primary identifier
      const displayName = screen.getByTestId("profile-display-name");
      expect(displayName).toHaveTextContent("john@example.com");
    });
  });

  describe("Email Display", () => {
    it("should display user email", () => {
      render(
        <ProfileHeader
          name="John Doe"
          email="john@example.com"
          image={null}
        />
      );

      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("should not duplicate email display when name is empty", () => {
      render(
        <ProfileHeader
          name=""
          email="john@example.com"
          image={null}
        />
      );

      // Email should only appear once when used as display name
      const emailElements = screen.getAllByText("john@example.com");
      expect(emailElements).toHaveLength(1);
    });
  });

  describe("Accessibility", () => {
    it("should have proper aria-label on avatar", () => {
      render(
        <ProfileHeader
          name="John Doe"
          email="john@example.com"
          image="https://example.com/avatar.jpg"
        />
      );

      expect(screen.getByRole("img", { name: /john doe's avatar/i })).toBeInTheDocument();
    });

    it("should have heading structure for name", () => {
      render(
        <ProfileHeader
          name="John Doe"
          email="john@example.com"
          image={null}
        />
      );

      // The display name should be in a heading
      expect(screen.getByRole("heading", { name: "John Doe" })).toBeInTheDocument();
    });
  });
});
