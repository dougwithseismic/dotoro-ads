import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileDetails } from "../components/ProfileDetails";

describe("ProfileDetails", () => {
  // Mock date for consistent testing
  const mockDate = new Date("2024-06-15T10:00:00Z");
  const mockDateString = "2024-06-15T10:00:00Z";

  describe("Email Verification Status", () => {
    it("should display verified badge when email is verified", () => {
      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={true}
          createdAt={mockDate}
          updatedAt={mockDate}
        />
      );

      expect(screen.getByText(/verified/i)).toBeInTheDocument();
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });

    it("should display unverified warning when email is not verified", () => {
      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={false}
          createdAt={mockDate}
          updatedAt={mockDate}
        />
      );

      expect(screen.getByText(/not verified/i)).toBeInTheDocument();
      expect(screen.getByTestId("unverified-badge")).toBeInTheDocument();
    });

    it("should show checkmark icon for verified status", () => {
      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={true}
          createdAt={mockDate}
          updatedAt={mockDate}
        />
      );

      const verifiedBadge = screen.getByTestId("verified-badge");
      expect(verifiedBadge).toHaveClass("text-green-600");
    });

    it("should show warning icon for unverified status", () => {
      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={false}
          createdAt={mockDate}
          updatedAt={mockDate}
        />
      );

      const unverifiedBadge = screen.getByTestId("unverified-badge");
      expect(unverifiedBadge).toHaveClass("text-amber-600");
    });
  });

  describe("Account Creation Date", () => {
    it("should display member since date", () => {
      const createdAt = new Date("2023-01-15T10:00:00Z");

      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={true}
          createdAt={createdAt}
          updatedAt={mockDate}
        />
      );

      expect(screen.getByText(/member since/i)).toBeInTheDocument();
      expect(screen.getByText(/january 2023/i)).toBeInTheDocument();
    });

    it("should format dates correctly for different months", () => {
      const createdAt = new Date("2024-06-01T10:00:00Z");

      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={true}
          createdAt={createdAt}
          updatedAt={mockDate}
        />
      );

      expect(screen.getByText(/june 2024/i)).toBeInTheDocument();
    });
  });

  describe("Last Updated Timestamp", () => {
    it("should display last updated date", () => {
      const updatedAt = new Date("2024-06-15T10:00:00Z");

      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={true}
          createdAt={mockDate}
          updatedAt={updatedAt}
        />
      );

      expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    });

    it("should format last updated date with day and time", () => {
      const updatedAt = new Date("2024-06-15T14:30:00Z");

      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={true}
          createdAt={mockDate}
          updatedAt={updatedAt}
        />
      );

      // Should show formatted date including June 15, 2024
      const lastUpdatedSection = screen.getByTestId("last-updated");
      expect(lastUpdatedSection).toHaveTextContent(/june 15, 2024/i);
    });
  });

  describe("Email Display", () => {
    it("should display user email with label", () => {
      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={true}
          createdAt={mockDate}
          updatedAt={mockDate}
        />
      );

      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText(/email/i)).toBeInTheDocument();
    });
  });

  describe("Layout Structure", () => {
    it("should render all detail sections when dates are provided", () => {
      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={true}
          createdAt={mockDate}
          updatedAt={mockDate}
        />
      );

      expect(screen.getByTestId("profile-details")).toBeInTheDocument();
      expect(screen.getByTestId("email-section")).toBeInTheDocument();
      expect(screen.getByTestId("member-since-section")).toBeInTheDocument();
      expect(screen.getByTestId("last-updated")).toBeInTheDocument();
    });

    it("should hide date sections when dates are not provided", () => {
      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={true}
        />
      );

      expect(screen.getByTestId("profile-details")).toBeInTheDocument();
      expect(screen.getByTestId("email-section")).toBeInTheDocument();
      expect(screen.queryByTestId("member-since-section")).not.toBeInTheDocument();
      expect(screen.queryByTestId("last-updated")).not.toBeInTheDocument();
    });

    it("should hide date sections when dates are null", () => {
      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={true}
          createdAt={null}
          updatedAt={null}
        />
      );

      expect(screen.queryByTestId("member-since-section")).not.toBeInTheDocument();
      expect(screen.queryByTestId("last-updated")).not.toBeInTheDocument();
    });
  });

  describe("Date String Parsing", () => {
    it("should handle ISO date strings", () => {
      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={true}
          createdAt={mockDateString}
          updatedAt={mockDateString}
        />
      );

      expect(screen.getByTestId("member-since-section")).toBeInTheDocument();
      expect(screen.getByText(/june 2024/i)).toBeInTheDocument();
    });

    it("should handle invalid date strings gracefully", () => {
      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={true}
          createdAt="not-a-date"
          updatedAt="also-invalid"
        />
      );

      // Should not crash and should hide the date sections
      expect(screen.getByTestId("profile-details")).toBeInTheDocument();
      expect(screen.queryByTestId("member-since-section")).not.toBeInTheDocument();
      expect(screen.queryByTestId("last-updated")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper semantic structure", () => {
      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={true}
          createdAt={mockDate}
          updatedAt={mockDate}
        />
      );

      // Details should be in a description list or similar semantic structure
      const detailsContainer = screen.getByTestId("profile-details");
      expect(detailsContainer).toBeInTheDocument();
    });

    it("should have accessible label for verification status", () => {
      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={true}
          createdAt={mockDate}
          updatedAt={mockDate}
        />
      );

      const verifiedBadge = screen.getByTestId("verified-badge");
      expect(verifiedBadge).toHaveAttribute("aria-label", "Email verified");
    });

    it("should have accessible label for unverified status", () => {
      render(
        <ProfileDetails
          email="john@example.com"
          emailVerified={false}
          createdAt={mockDate}
          updatedAt={mockDate}
        />
      );

      const unverifiedBadge = screen.getByTestId("unverified-badge");
      expect(unverifiedBadge).toHaveAttribute("aria-label", "Email not verified");
    });
  });
});
