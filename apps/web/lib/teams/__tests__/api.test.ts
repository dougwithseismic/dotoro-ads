import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Teams API - resendInvitation", () => {
  const API_BASE = "http://localhost:3001";

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset modules to get fresh imports
    vi.resetModules();
    // Set the environment variable
    process.env.NEXT_PUBLIC_API_URL = API_BASE;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("resendInvitation", () => {
    const teamId = "team-123";
    const invitationId = "inv-456";

    it("should make POST request to correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            emailSent: true,
          }),
      });

      const { resendInvitation } = await import("../api");
      await resendInvitation(teamId, invitationId);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/api/teams/${teamId}/invitations/${invitationId}/resend`,
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should return success response when email is sent", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            emailSent: true,
          }),
      });

      const { resendInvitation } = await import("../api");
      const result = await resendInvitation(teamId, invitationId);

      expect(result).toEqual({
        success: true,
        emailSent: true,
      });
    });

    it("should return response with emailError and inviteLink when email fails", async () => {
      const expectedResponse = {
        success: true,
        emailSent: false,
        emailError: "SMTP connection failed",
        inviteLink: "http://localhost:3000/invite/abc123",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(expectedResponse),
      });

      const { resendInvitation } = await import("../api");
      const result = await resendInvitation(teamId, invitationId);

      expect(result).toEqual(expectedResponse);
      expect(result.emailSent).toBe(false);
      expect(result.emailError).toBe("SMTP connection failed");
      expect(result.inviteLink).toBe("http://localhost:3000/invite/abc123");
    });

    it("should throw error on 401 Unauthorized", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Authentication required" }),
      });

      const { resendInvitation } = await import("../api");

      await expect(resendInvitation(teamId, invitationId)).rejects.toThrow(
        "Authentication required"
      );
    });

    it("should throw error on 403 Forbidden", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({ error: "Admin or owner role required" }),
      });

      const { resendInvitation } = await import("../api");

      await expect(resendInvitation(teamId, invitationId)).rejects.toThrow(
        "Admin or owner role required"
      );
    });

    it("should throw error on 404 Not Found for team", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Team not found" }),
      });

      const { resendInvitation } = await import("../api");

      await expect(resendInvitation(teamId, invitationId)).rejects.toThrow(
        "Team not found"
      );
    });

    it("should throw error on 404 Not Found for invitation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Invitation not found" }),
      });

      const { resendInvitation } = await import("../api");

      await expect(resendInvitation(teamId, invitationId)).rejects.toThrow(
        "Invitation not found"
      );
    });

    it("should throw error on 404 for expired invitation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Invitation has expired" }),
      });

      const { resendInvitation } = await import("../api");

      await expect(resendInvitation(teamId, invitationId)).rejects.toThrow(
        "Invitation has expired"
      );
    });

    it("should throw error on 404 for already accepted invitation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({ error: "Invitation has already been accepted" }),
      });

      const { resendInvitation } = await import("../api");

      await expect(resendInvitation(teamId, invitationId)).rejects.toThrow(
        "Invitation has already been accepted"
      );
    });

    it("should throw generic error on 500 Internal Server Error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Internal server error" }),
      });

      const { resendInvitation } = await import("../api");

      await expect(resendInvitation(teamId, invitationId)).rejects.toThrow(
        "Internal server error"
      );
    });

    it("should handle JSON parse failure gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const { resendInvitation } = await import("../api");

      await expect(resendInvitation(teamId, invitationId)).rejects.toThrow(
        "Request failed"
      );
    });
  });
});
