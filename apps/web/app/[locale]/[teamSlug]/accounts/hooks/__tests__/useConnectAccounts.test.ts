import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConnectAccounts } from "../useConnectAccounts";
import { api } from "@/lib/api-client";

// Mock the API client
vi.mock("@/lib/api-client", () => ({
  api: {
    post: vi.fn(),
  },
}));

const mockApi = api as {
  post: ReturnType<typeof vi.fn>;
};

describe("useConnectAccounts", () => {
  const mockTeamId = "660e8400-e29b-41d4-a716-446655440001";
  const mockAccountIds = ["t5_acc_1", "t5_acc_2"];

  const mockConnectResponse = {
    success: true,
    connectedCount: 2,
    connectedAccounts: [
      { id: "uuid-1", accountId: "t5_acc_1", accountName: "Account 1" },
      { id: "uuid-2", accountId: "t5_acc_2", accountName: "Account 2" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useConnectAccounts());

      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.connectedAccounts).toEqual([]);
    });
  });

  describe("connect", () => {
    it("should set isConnecting to true while connecting", async () => {
      mockApi.post.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockConnectResponse), 100)
          )
      );

      const { result } = renderHook(() => useConnectAccounts());

      act(() => {
        result.current.connect(mockTeamId, mockAccountIds);
      });

      expect(result.current.isConnecting).toBe(true);
    });

    it("should connect accounts and update state on success", async () => {
      mockApi.post.mockResolvedValue(mockConnectResponse);

      const { result } = renderHook(() => useConnectAccounts());

      let response;
      await act(async () => {
        response = await result.current.connect(mockTeamId, mockAccountIds);
      });

      expect(response).toEqual(mockConnectResponse);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.connectedAccounts).toEqual(
        mockConnectResponse.connectedAccounts
      );
    });

    it("should call API with correct endpoint and body", async () => {
      mockApi.post.mockResolvedValue(mockConnectResponse);

      const { result } = renderHook(() => useConnectAccounts());

      await act(async () => {
        await result.current.connect(mockTeamId, mockAccountIds);
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        "/api/v1/reddit/connect-accounts",
        {
          teamId: mockTeamId,
          accountIds: mockAccountIds,
        }
      );
    });

    it("should return null and set error when accountIds is empty", async () => {
      const { result } = renderHook(() => useConnectAccounts());

      let response;
      await act(async () => {
        response = await result.current.connect(mockTeamId, []);
      });

      expect(response).toBeNull();
      expect(result.current.error).toBe(
        "Please select at least one account to connect"
      );
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it("should set error state on API failure", async () => {
      const errorMessage = "No pending OAuth session found";
      mockApi.post.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useConnectAccounts());

      let response;
      await act(async () => {
        response = await result.current.connect(mockTeamId, mockAccountIds);
      });

      expect(response).toBeNull();
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isConnecting).toBe(false);
    });

    it("should handle non-Error rejection", async () => {
      mockApi.post.mockRejectedValue("Unknown error");

      const { result } = renderHook(() => useConnectAccounts());

      await act(async () => {
        await result.current.connect(mockTeamId, mockAccountIds);
      });

      expect(result.current.error).toBe("Failed to connect accounts");
    });

    it("should clear error when connecting again", async () => {
      mockApi.post.mockRejectedValueOnce(new Error("First error"));
      mockApi.post.mockResolvedValueOnce(mockConnectResponse);

      const { result } = renderHook(() => useConnectAccounts());

      // First call fails
      await act(async () => {
        await result.current.connect(mockTeamId, mockAccountIds);
      });
      expect(result.current.error).toBe("First error");

      // Second call succeeds
      await act(async () => {
        await result.current.connect(mockTeamId, mockAccountIds);
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe("clearError", () => {
    it("should clear the error state", async () => {
      mockApi.post.mockRejectedValue(new Error("Test error"));

      const { result } = renderHook(() => useConnectAccounts());

      await act(async () => {
        await result.current.connect(mockTeamId, mockAccountIds);
      });
      expect(result.current.error).toBe("Test error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("reset", () => {
    it("should reset all state to initial values", async () => {
      mockApi.post.mockResolvedValue(mockConnectResponse);

      const { result } = renderHook(() => useConnectAccounts());

      await act(async () => {
        await result.current.connect(mockTeamId, mockAccountIds);
      });

      expect(result.current.connectedAccounts.length).toBe(2);

      act(() => {
        result.current.reset();
      });

      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.connectedAccounts).toEqual([]);
    });
  });

  describe("response with skipped count", () => {
    it("should handle response with skipped accounts", async () => {
      const responseWithSkipped = {
        ...mockConnectResponse,
        skippedCount: 1,
        connectedCount: 1,
        connectedAccounts: [
          { id: "uuid-1", accountId: "t5_acc_1", accountName: "Account 1" },
        ],
      };

      mockApi.post.mockResolvedValue(responseWithSkipped);

      const { result } = renderHook(() => useConnectAccounts());

      let response;
      await act(async () => {
        response = await result.current.connect(mockTeamId, mockAccountIds);
      });

      expect(response?.skippedCount).toBe(1);
      expect(response?.connectedCount).toBe(1);
    });
  });
});
