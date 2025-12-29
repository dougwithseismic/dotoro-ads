import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AdvancedTab } from "../AdvancedTab";

describe("AdvancedTab", () => {
  const defaultProps = {
    team: {
      id: "team-1",
      name: "Test Team",
      slug: "test-team",
      description: null,
      avatarUrl: null,
      plan: "free" as const,
      memberCount: 3,
      role: "owner" as const,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      settings: {
        timezone: "America/New_York",
        defaultMemberRole: "viewer",
        notifications: {
          emailDigest: false,
          slackWebhook: "",
        },
      },
      billingEmail: null,
    },
    onUpdateSettings: vi.fn().mockResolvedValue(undefined),
  };

  describe("rendering", () => {
    it("renders the advanced tab component", () => {
      render(<AdvancedTab {...defaultProps} />);

      expect(screen.getByTestId("advanced-tab")).toBeInTheDocument();
    });

    it("displays all three settings sections", () => {
      render(<AdvancedTab {...defaultProps} />);

      expect(screen.getByText(/invitation defaults/i)).toBeInTheDocument();
      expect(screen.getByText(/time & locale/i)).toBeInTheDocument();
      // Use heading role to find the Notifications section title specifically
      expect(screen.getByRole("heading", { name: /notifications/i })).toBeInTheDocument();
    });
  });

  describe("Invitation Defaults section", () => {
    it("renders the DefaultRoleSelector component", () => {
      render(<AdvancedTab {...defaultProps} />);

      expect(screen.getByTestId("default-role-selector")).toBeInTheDocument();
    });

    it("passes correct current role to selector", () => {
      render(<AdvancedTab {...defaultProps} />);

      expect(screen.getByRole("combobox", { name: /default role/i })).toHaveTextContent(/viewer/i);
    });
  });

  describe("Time & Locale section", () => {
    it("renders the TimezoneSelector component", () => {
      render(<AdvancedTab {...defaultProps} />);

      expect(screen.getByTestId("timezone-selector")).toBeInTheDocument();
    });

    it("passes correct timezone to selector", () => {
      render(<AdvancedTab {...defaultProps} />);

      expect(screen.getByRole("combobox", { name: /team timezone/i })).toHaveTextContent(/America\/New_York/);
    });
  });

  describe("Notifications section", () => {
    it("renders the NotificationPreferences component", () => {
      render(<AdvancedTab {...defaultProps} />);

      expect(screen.getByTestId("notification-preferences")).toBeInTheDocument();
    });

    it("passes correct email digest state", () => {
      const propsWithDigest = {
        ...defaultProps,
        team: {
          ...defaultProps.team,
          settings: {
            ...defaultProps.team.settings,
            notifications: {
              emailDigest: true,
              slackWebhook: "",
            },
          },
        },
      };
      render(<AdvancedTab {...propsWithDigest} />);

      expect(screen.getByRole("checkbox", { name: /email digest/i })).toBeChecked();
    });
  });

  describe("permission control", () => {
    it("enables editing for owners", () => {
      render(<AdvancedTab {...defaultProps} />);

      // Role selector should be enabled
      expect(screen.getByRole("combobox", { name: /default role/i })).not.toBeDisabled();
      // Timezone selector should be enabled
      expect(screen.getByRole("combobox", { name: /team timezone/i })).not.toBeDisabled();
    });

    it("enables editing for admins", () => {
      const adminProps = {
        ...defaultProps,
        team: { ...defaultProps.team, role: "admin" as const },
      };
      render(<AdvancedTab {...adminProps} />);

      expect(screen.getByRole("combobox", { name: /default role/i })).not.toBeDisabled();
    });

    it("disables editing for editors", () => {
      const editorProps = {
        ...defaultProps,
        team: { ...defaultProps.team, role: "editor" as const },
      };
      render(<AdvancedTab {...editorProps} />);

      expect(screen.getByRole("combobox", { name: /default role/i })).toBeDisabled();
    });

    it("disables editing for viewers", () => {
      const viewerProps = {
        ...defaultProps,
        team: { ...defaultProps.team, role: "viewer" as const },
      };
      render(<AdvancedTab {...viewerProps} />);

      expect(screen.getByRole("combobox", { name: /default role/i })).toBeDisabled();
    });
  });

  describe("default values", () => {
    it("handles missing settings gracefully", () => {
      const propsWithNoSettings = {
        ...defaultProps,
        team: {
          ...defaultProps.team,
          settings: null,
        },
      };
      render(<AdvancedTab {...propsWithNoSettings} />);

      // Should render without errors
      expect(screen.getByTestId("advanced-tab")).toBeInTheDocument();
    });

    it("uses default values for missing notification settings", () => {
      const propsWithPartialSettings = {
        ...defaultProps,
        team: {
          ...defaultProps.team,
          settings: {
            timezone: "America/New_York",
          },
        },
      };
      render(<AdvancedTab {...propsWithPartialSettings} />);

      // Email digest should default to unchecked
      expect(screen.getByRole("checkbox", { name: /email digest/i })).not.toBeChecked();
    });
  });

  describe("SettingsSection usage", () => {
    it("uses SettingsSection for grouping", () => {
      render(<AdvancedTab {...defaultProps} />);

      // Should have 3 settings sections
      const sections = screen.getAllByTestId("settings-section");
      expect(sections.length).toBe(3);
    });
  });
});
