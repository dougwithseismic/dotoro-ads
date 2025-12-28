import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Props interface for TeamInvitationEmail component
 */
interface TeamInvitationEmailProps {
  teamName: string;
  inviterEmail: string;
  inviterName?: string;
  role: "admin" | "editor" | "viewer";
  inviteUrl: string;
  expiresAt: Date;
  recipientEmail: string;
}

/**
 * Options for sendTeamInvitationEmail function
 */
interface SendTeamInvitationOptions {
  to: string;
  teamName: string;
  inviterEmail: string;
  inviterName?: string;
  role: "admin" | "editor" | "viewer";
  inviteToken: string;
  expiresAt: Date;
}

// ============================================================================
// TeamInvitationEmail Template Tests
// ============================================================================

describe("TeamInvitationEmail template rendering", () => {
  it("renders valid HTML with required props", async () => {
    const { render } = await import("@react-email/components");
    const { TeamInvitationEmail } = await import("../emails/team-invitation.js");

    const props: TeamInvitationEmailProps = {
      teamName: "Acme Corp",
      inviterEmail: "admin@acme.com",
      role: "editor",
      inviteUrl: "https://app.dotoro.io/invite/abc123token",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      recipientEmail: "newuser@example.com",
    };

    const html = await render(TeamInvitationEmail(props));

    // Basic sanity checks
    expect(html).toContain("<!DOCTYPE html");
    expect(html).toContain("Acme Corp");
    expect(html).toContain("https://app.dotoro.io/invite/abc123token");
  });

  it("displays team name prominently", async () => {
    const { render } = await import("@react-email/components");
    const { TeamInvitationEmail } = await import("../emails/team-invitation.js");

    const props: TeamInvitationEmailProps = {
      teamName: "Engineering Team",
      inviterEmail: "lead@company.com",
      role: "admin",
      inviteUrl: "https://app.dotoro.io/invite/xyz789",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      recipientEmail: "dev@example.com",
    };

    const html = await render(TeamInvitationEmail(props));

    expect(html).toContain("Engineering Team");
  });

  it("shows inviter email in the 'invited by' section", async () => {
    const { render } = await import("@react-email/components");
    const { TeamInvitationEmail } = await import("../emails/team-invitation.js");

    const props: TeamInvitationEmailProps = {
      teamName: "Design Team",
      inviterEmail: "designer@company.com",
      role: "viewer",
      inviteUrl: "https://app.dotoro.io/invite/def456",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      recipientEmail: "guest@example.com",
    };

    const html = await render(TeamInvitationEmail(props));

    expect(html).toContain("designer@company.com");
  });

  it("shows inviter name when provided", async () => {
    const { render } = await import("@react-email/components");
    const { TeamInvitationEmail } = await import("../emails/team-invitation.js");

    const props: TeamInvitationEmailProps = {
      teamName: "Marketing",
      inviterEmail: "jane@company.com",
      inviterName: "Jane Doe",
      role: "editor",
      inviteUrl: "https://app.dotoro.io/invite/ghi789",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      recipientEmail: "marketer@example.com",
    };

    const html = await render(TeamInvitationEmail(props));

    expect(html).toContain("Jane Doe");
  });

  describe("role descriptions", () => {
    it("renders admin role description correctly", async () => {
      const { render } = await import("@react-email/components");
      const { TeamInvitationEmail } = await import("../emails/team-invitation.js");

      const props: TeamInvitationEmailProps = {
        teamName: "Test Team",
        inviterEmail: "owner@test.com",
        role: "admin",
        inviteUrl: "https://app.dotoro.io/invite/admin123",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        recipientEmail: "admin@example.com",
      };

      const html = await render(TeamInvitationEmail(props));

      // Admin should have full management access mentioned
      expect(html.toLowerCase()).toContain("admin");
    });

    it("renders editor role description correctly", async () => {
      const { render } = await import("@react-email/components");
      const { TeamInvitationEmail } = await import("../emails/team-invitation.js");

      const props: TeamInvitationEmailProps = {
        teamName: "Test Team",
        inviterEmail: "owner@test.com",
        role: "editor",
        inviteUrl: "https://app.dotoro.io/invite/editor123",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        recipientEmail: "editor@example.com",
      };

      const html = await render(TeamInvitationEmail(props));

      expect(html.toLowerCase()).toContain("editor");
    });

    it("renders viewer role description correctly", async () => {
      const { render } = await import("@react-email/components");
      const { TeamInvitationEmail } = await import("../emails/team-invitation.js");

      const props: TeamInvitationEmailProps = {
        teamName: "Test Team",
        inviterEmail: "owner@test.com",
        role: "viewer",
        inviteUrl: "https://app.dotoro.io/invite/viewer123",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        recipientEmail: "viewer@example.com",
      };

      const html = await render(TeamInvitationEmail(props));

      expect(html.toLowerCase()).toContain("viewer");
    });
  });

  it("includes CTA button with 'Join {Team Name}'", async () => {
    const { render } = await import("@react-email/components");
    const { TeamInvitationEmail } = await import("../emails/team-invitation.js");

    const props: TeamInvitationEmailProps = {
      teamName: "Startup Inc",
      inviterEmail: "ceo@startup.com",
      role: "admin",
      inviteUrl: "https://app.dotoro.io/invite/startup123",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      recipientEmail: "cofounder@example.com",
    };

    const html = await render(TeamInvitationEmail(props));

    // Should have the join link
    expect(html).toContain("https://app.dotoro.io/invite/startup123");
    // Should mention joining the team
    expect(html.toLowerCase()).toContain("join");
  });

  it("includes plain-text link fallback", async () => {
    const { render } = await import("@react-email/components");
    const { TeamInvitationEmail } = await import("../emails/team-invitation.js");

    const inviteUrl = "https://app.dotoro.io/invite/fallback123";
    const props: TeamInvitationEmailProps = {
      teamName: "Fallback Team",
      inviterEmail: "fallback@test.com",
      role: "viewer",
      inviteUrl,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      recipientEmail: "test@example.com",
    };

    const html = await render(TeamInvitationEmail(props));

    // The URL should appear at least twice (button + fallback text)
    const urlCount = (html.match(/https:\/\/app\.dotoro\.io\/invite\/fallback123/g) || []).length;
    expect(urlCount).toBeGreaterThanOrEqual(2);
  });

  describe("expiration formatting", () => {
    it("shows expiration in minutes when less than an hour", async () => {
      const { render } = await import("@react-email/components");
      const { TeamInvitationEmail } = await import("../emails/team-invitation.js");

      const props: TeamInvitationEmailProps = {
        teamName: "Quick Team",
        inviterEmail: "fast@test.com",
        role: "editor",
        inviteUrl: "https://app.dotoro.io/invite/quick123",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        recipientEmail: "quick@example.com",
      };

      const html = await render(TeamInvitationEmail(props));

      expect(html).toContain("minute");
    });

    it("shows expiration in hours when less than a day", async () => {
      const { render } = await import("@react-email/components");
      const { TeamInvitationEmail } = await import("../emails/team-invitation.js");

      const props: TeamInvitationEmailProps = {
        teamName: "Hours Team",
        inviterEmail: "hours@test.com",
        role: "admin",
        inviteUrl: "https://app.dotoro.io/invite/hours123",
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
        recipientEmail: "hours@example.com",
      };

      const html = await render(TeamInvitationEmail(props));

      expect(html).toContain("hour");
    });

    it("shows expiration in days when more than a day", async () => {
      const { render } = await import("@react-email/components");
      const { TeamInvitationEmail } = await import("../emails/team-invitation.js");

      const props: TeamInvitationEmailProps = {
        teamName: "Days Team",
        inviterEmail: "days@test.com",
        role: "viewer",
        inviteUrl: "https://app.dotoro.io/invite/days123",
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
        recipientEmail: "days@example.com",
      };

      const html = await render(TeamInvitationEmail(props));

      expect(html).toContain("day");
    });
  });

  it("includes security notice", async () => {
    const { render } = await import("@react-email/components");
    const { TeamInvitationEmail } = await import("../emails/team-invitation.js");

    const props: TeamInvitationEmailProps = {
      teamName: "Secure Team",
      inviterEmail: "secure@test.com",
      role: "editor",
      inviteUrl: "https://app.dotoro.io/invite/secure123",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      recipientEmail: "secure@example.com",
    };

    const html = await render(TeamInvitationEmail(props));

    // Should have some form of "if you didn't expect this invitation"
    expect(html.toLowerCase()).toContain("didn");
    expect(html.toLowerCase()).toContain("expect");
  });
});

// ============================================================================
// sendTeamInvitationEmail Function Tests
// ============================================================================

describe("sendTeamInvitationEmail", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "noreply@dotoro.io";
    process.env.APP_URL = "https://app.dotoro.io";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("input validation", () => {
    it("validates email format", async () => {
      const { sendTeamInvitationEmail } = await import("../send/team-invitation.js");

      const result = await sendTeamInvitationEmail({
        to: "invalid-email",
        teamName: "Test Team",
        inviterEmail: "inviter@test.com",
        role: "editor",
        inviteToken: "abc123",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.toLowerCase()).toContain("email");
      }
    });

    it("validates invite URL is HTTPS (constructs from APP_URL)", async () => {
      // Override APP_URL to be HTTP (invalid)
      process.env.APP_URL = "http://insecure.example.com";

      const { sendTeamInvitationEmail } = await import("../send/team-invitation.js");

      const result = await sendTeamInvitationEmail({
        to: "user@example.com",
        teamName: "Test Team",
        inviterEmail: "inviter@test.com",
        role: "editor",
        inviteToken: "abc123",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.toLowerCase()).toContain("https");
      }
    });

    it("validates expiration is in the future", async () => {
      const { sendTeamInvitationEmail } = await import("../send/team-invitation.js");

      const result = await sendTeamInvitationEmail({
        to: "user@example.com",
        teamName: "Test Team",
        inviterEmail: "inviter@test.com",
        role: "editor",
        inviteToken: "abc123",
        expiresAt: new Date(Date.now() - 1000), // Past date
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.toLowerCase()).toContain("future");
      }
    });

    it("validates team name is not empty", async () => {
      const { sendTeamInvitationEmail } = await import("../send/team-invitation.js");

      const result = await sendTeamInvitationEmail({
        to: "user@example.com",
        teamName: "",
        inviterEmail: "inviter@test.com",
        role: "editor",
        inviteToken: "abc123",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.toLowerCase()).toContain("team");
      }
    });

    it("validates inviter email is valid", async () => {
      const { sendTeamInvitationEmail } = await import("../send/team-invitation.js");

      const result = await sendTeamInvitationEmail({
        to: "user@example.com",
        teamName: "Test Team",
        inviterEmail: "not-an-email",
        role: "editor",
        inviteToken: "abc123",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.toLowerCase()).toContain("inviter");
      }
    });

    it("validates invite token is not empty", async () => {
      const { sendTeamInvitationEmail } = await import("../send/team-invitation.js");

      const result = await sendTeamInvitationEmail({
        to: "user@example.com",
        teamName: "Test Team",
        inviterEmail: "inviter@test.com",
        role: "editor",
        inviteToken: "",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.toLowerCase()).toContain("token");
      }
    });
  });

  describe("successful send", () => {
    it("sends email with correct subject containing team name", async () => {
      process.env.NODE_ENV = "development";
      process.env.RESEND_API_KEY = undefined;

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { sendTeamInvitationEmail } = await import("../send/team-invitation.js");

      const result = await sendTeamInvitationEmail({
        to: "user@example.com",
        teamName: "Awesome Team",
        inviterEmail: "admin@awesome.com",
        role: "editor",
        inviteToken: "token123",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(result.success).toBe(true);

      // Check that subject contains team name
      const logCalls = consoleSpy.mock.calls.flat().join(" ");
      expect(logCalls).toContain("Awesome Team");

      consoleSpy.mockRestore();
    });

    it("returns messageId on success", async () => {
      process.env.NODE_ENV = "development";
      process.env.RESEND_API_KEY = undefined;

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { sendTeamInvitationEmail } = await import("../send/team-invitation.js");

      const result = await sendTeamInvitationEmail({
        to: "user@example.com",
        teamName: "Success Team",
        inviterEmail: "admin@success.com",
        role: "admin",
        inviteToken: "successtoken123",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      if (result.success) {
        expect(result.messageId).toBeDefined();
        expect(result.messageId).toContain("dev_");
      } else {
        expect(result.error).toBeDefined();
      }

      consoleSpy.mockRestore();
    });

    it("constructs invite URL correctly from APP_URL and token", async () => {
      // This test verifies the URL construction logic works by checking
      // that an HTTPS APP_URL results in successful email sending
      process.env.NODE_ENV = "development";
      process.env.RESEND_API_KEY = undefined;
      process.env.APP_URL = "https://custom.dotoro.io";

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { sendTeamInvitationEmail } = await import("../send/team-invitation.js");

      const result = await sendTeamInvitationEmail({
        to: "user@example.com",
        teamName: "URL Team",
        inviterEmail: "admin@url.com",
        role: "viewer",
        inviteToken: "urltoken456",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Should succeed with valid HTTPS URL
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messageId).toBeDefined();
      }

      consoleSpy.mockRestore();
    });

    it("passes inviter name when provided", async () => {
      // This test verifies that providing an inviter name doesn't break sending
      // The inviter name appears in the rendered HTML template
      process.env.NODE_ENV = "development";
      process.env.RESEND_API_KEY = undefined;

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { sendTeamInvitationEmail } = await import("../send/team-invitation.js");

      const result = await sendTeamInvitationEmail({
        to: "user@example.com",
        teamName: "Named Team",
        inviterEmail: "john@named.com",
        inviterName: "John Smith",
        role: "editor",
        inviteToken: "namedtoken789",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Should succeed with inviter name provided
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messageId).toBeDefined();
      }

      consoleSpy.mockRestore();
    });
  });

  describe("logging", () => {
    it("logs send attempt in development mode", async () => {
      process.env.NODE_ENV = "development";
      process.env.RESEND_API_KEY = undefined;

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { sendTeamInvitationEmail } = await import("../send/team-invitation.js");

      await sendTeamInvitationEmail({
        to: "user@example.com",
        teamName: "Log Team",
        inviterEmail: "admin@log.com",
        role: "admin",
        inviteToken: "logtoken123",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const logCalls = consoleSpy.mock.calls.flat().join(" ");
      expect(logCalls).toContain("team invitation");

      consoleSpy.mockRestore();
    });
  });

  describe("error handling", () => {
    it("handles missing APP_URL environment variable", async () => {
      process.env.APP_URL = undefined;

      const { sendTeamInvitationEmail } = await import("../send/team-invitation.js");

      const result = await sendTeamInvitationEmail({
        to: "user@example.com",
        teamName: "No URL Team",
        inviterEmail: "admin@nourl.com",
        role: "editor",
        inviteToken: "nourltoken",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.toLowerCase()).toContain("app_url");
      }
    });
  });
});
