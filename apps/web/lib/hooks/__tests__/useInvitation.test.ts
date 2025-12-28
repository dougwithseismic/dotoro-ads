/**
 * useInvitation Hook Tests
 *
 * TDD tests for the invitation data fetching hook.
 * Tests all scenarios: loading, success, various error states.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useInvitation } from "../useInvitation";
import { api } from "../../api-client";

// Mock the API client
vi.mock("../../api-client", () => ({
  api: {
    get: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    data?: unknown;
    constructor(message: string, status: number, data?: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  },
}));

const mockApi = api as { get: ReturnType<typeof vi.fn> };

// Test data
const mockValidInvitation = {
  teamName: "Acme Corp",
  teamSlug: "acme-corp",
  inviterEmail: "admin@acme.com",
  role: "editor" as const,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
};

const mockExpiredInvitation = {
  ...mockValidInvitation,
  expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
};

describe("useInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Loading State", () => {
    it("should return loading state initially", () => {
      // Mock a pending promise to keep loading state
      mockApi.get.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useInvitation("valid-token"));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.invitation).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it("should set isLoading to false after fetch completes", async () => {
      mockApi.get.mockResolvedValue(mockValidInvitation);

      const { result } = renderHook(() => useInvitation("valid-token"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("Success State", () => {
    it("should return invitation details on successful fetch", async () => {
      mockApi.get.mockResolvedValue(mockValidInvitation);

      const { result } = renderHook(() => useInvitation("valid-token"));

      await waitFor(() => {
        expect(result.current.invitation).toEqual(mockValidInvitation);
      });

      expect(result.current.error).toBe(null);
      expect(result.current.isLoading).toBe(false);
    });

    it("should call the correct API endpoint with token", async () => {
      mockApi.get.mockResolvedValue(mockValidInvitation);

      renderHook(() => useInvitation("my-test-token"));

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith("/api/invitations/my-test-token");
      });
    });

    it("should include all required fields in invitation response", async () => {
      mockApi.get.mockResolvedValue(mockValidInvitation);

      const { result } = renderHook(() => useInvitation("valid-token"));

      await waitFor(() => {
        expect(result.current.invitation).not.toBe(null);
      });

      const invitation = result.current.invitation!;
      expect(invitation.teamName).toBe("Acme Corp");
      expect(invitation.teamSlug).toBe("acme-corp");
      expect(invitation.inviterEmail).toBe("admin@acme.com");
      expect(invitation.role).toBe("editor");
      expect(invitation.expiresAt).toBeDefined();
    });
  });

  describe("Error States", () => {
    it("should handle 404 Not Found error for invalid token", async () => {
      const error = new Error("Invitation not found");
      (error as any).status = 404;
      (error as any).data = { message: "Invitation not found" };
      mockApi.get.mockRejectedValue(error);

      const { result } = renderHook(() => useInvitation("invalid-token"));

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.error?.status).toBe(404);
      expect(result.current.invitation).toBe(null);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle 404 error for expired invitation", async () => {
      const error = new Error("Invitation has expired");
      (error as any).status = 404;
      (error as any).data = { message: "Invitation has expired" };
      mockApi.get.mockRejectedValue(error);

      const { result } = renderHook(() => useInvitation("expired-token"));

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.error?.status).toBe(404);
      expect(result.current.error?.message).toContain("expired");
    });

    it("should handle 404 error for already accepted invitation", async () => {
      const error = new Error("Invitation has already been accepted");
      (error as any).status = 404;
      (error as any).data = { message: "Invitation has already been accepted" };
      mockApi.get.mockRejectedValue(error);

      const { result } = renderHook(() => useInvitation("accepted-token"));

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.error?.status).toBe(404);
      expect(result.current.error?.message).toContain("accepted");
    });

    it("should handle network errors", async () => {
      const error = new TypeError("Failed to fetch");
      mockApi.get.mockRejectedValue(error);

      const { result } = renderHook(() => useInvitation("any-token"));

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.invitation).toBe(null);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle 500 server errors", async () => {
      const error = new Error("Internal server error");
      (error as any).status = 500;
      mockApi.get.mockRejectedValue(error);

      const { result } = renderHook(() => useInvitation("any-token"));

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.error?.status).toBe(500);
    });
  });

  describe("Refetch Functionality", () => {
    it("should provide a refetch function", async () => {
      mockApi.get.mockResolvedValue(mockValidInvitation);

      const { result } = renderHook(() => useInvitation("valid-token"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe("function");
    });

    it("should refetch data when refetch is called", async () => {
      mockApi.get.mockResolvedValue(mockValidInvitation);

      const { result } = renderHook(() => useInvitation("valid-token"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear mock to verify next call
      mockApi.get.mockClear();
      mockApi.get.mockResolvedValue({
        ...mockValidInvitation,
        teamName: "Updated Team Name",
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should not fetch if token is empty", async () => {
      const { result } = renderHook(() => useInvitation(""));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApi.get).not.toHaveBeenCalled();
      expect(result.current.error?.message).toContain("token");
    });

    it("should update when token changes", async () => {
      mockApi.get.mockResolvedValue(mockValidInvitation);

      const { result, rerender } = renderHook(
        ({ token }) => useInvitation(token),
        { initialProps: { token: "token-1" } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApi.get).toHaveBeenCalledWith("/api/invitations/token-1");

      // Change token
      rerender({ token: "token-2" });

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith("/api/invitations/token-2");
      });
    });
  });

  describe("Error Type Detection", () => {
    it("should identify NOT_FOUND errors correctly", async () => {
      const error = new Error("Invitation not found");
      (error as any).status = 404;
      (error as any).data = { code: "NOT_FOUND" };
      mockApi.get.mockRejectedValue(error);

      const { result } = renderHook(() => useInvitation("invalid-token"));

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.errorType).toBe("not_found");
    });

    it("should identify EXPIRED errors correctly", async () => {
      const error = new Error("Invitation has expired");
      (error as any).status = 404;
      (error as any).data = { message: "Invitation has expired" };
      mockApi.get.mockRejectedValue(error);

      const { result } = renderHook(() => useInvitation("expired-token"));

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.errorType).toBe("expired");
    });

    it("should identify ALREADY_ACCEPTED errors correctly", async () => {
      const error = new Error("Invitation has already been accepted");
      (error as any).status = 404;
      (error as any).data = { message: "Invitation has already been accepted" };
      mockApi.get.mockRejectedValue(error);

      const { result } = renderHook(() => useInvitation("accepted-token"));

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.errorType).toBe("already_accepted");
    });

    it("should identify NETWORK errors correctly", async () => {
      const error = new TypeError("Failed to fetch");
      mockApi.get.mockRejectedValue(error);

      const { result } = renderHook(() => useInvitation("any-token"));

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.errorType).toBe("network");
    });
  });
});
