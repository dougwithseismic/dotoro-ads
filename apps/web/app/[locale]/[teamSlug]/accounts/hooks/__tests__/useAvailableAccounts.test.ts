import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAvailableAccounts } from "../useAvailableAccounts";
import { api } from "@/lib/api-client";

// Mock the API client
vi.mock("@/lib/api-client", () => ({
  api: {
    get: vi.fn(),
  },
}));

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
};

describe("useAvailableAccounts", () => {
  const mockTeamId = "660e8400-e29b-41d4-a716-446655440001";

  const mockBusinessesResponse = {
    businesses: [
      {
        id: "biz_1",
        name: "My Business",
        accounts: [
          {
            id: "t5_acc_1",
            name: "Account 1",
            type: "SELF_SERVE" as const,
            currency: "USD",
            alreadyConnected: false,
          },
          {
            id: "t5_acc_2",
            name: "Account 2",
            type: "MANAGED" as const,
            currency: "USD",
            alreadyConnected: true,
          },
        ],
      },
      {
        id: "biz_2",
        name: "Client Business",
        accounts: [
          {
            id: "t5_acc_3",
            name: "Client Account",
            type: "SELF_SERVE" as const,
            currency: "EUR",
            alreadyConnected: false,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initial state", () => {
    it("should have empty businesses array initially", () => {
      const { result } = renderHook(() => useAvailableAccounts());

      expect(result.current.businesses).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("fetchAvailableAccounts", () => {
    it("should set isLoading to true while fetching", async () => {
      mockApi.get.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockBusinessesResponse), 100)
          )
      );

      const { result } = renderHook(() => useAvailableAccounts());

      act(() => {
        result.current.fetchAvailableAccounts(mockTeamId);
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("should fetch accounts and update state on success", async () => {
      mockApi.get.mockResolvedValue(mockBusinessesResponse);

      const { result } = renderHook(() => useAvailableAccounts());

      await act(async () => {
        await result.current.fetchAvailableAccounts(mockTeamId);
      });

      expect(result.current.businesses).toEqual(mockBusinessesResponse.businesses);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should call API with correct endpoint and teamId", async () => {
      mockApi.get.mockResolvedValue(mockBusinessesResponse);

      const { result } = renderHook(() => useAvailableAccounts());

      await act(async () => {
        await result.current.fetchAvailableAccounts(mockTeamId);
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        `/api/v1/reddit/available-accounts?teamId=${mockTeamId}`
      );
    });

    it("should set error state on API failure", async () => {
      const errorMessage = "No pending OAuth session found";
      mockApi.get.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAvailableAccounts());

      await act(async () => {
        await result.current.fetchAvailableAccounts(mockTeamId);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.businesses).toEqual([]);
    });

    it("should handle non-Error rejection", async () => {
      mockApi.get.mockRejectedValue("Unknown error");

      const { result } = renderHook(() => useAvailableAccounts());

      await act(async () => {
        await result.current.fetchAvailableAccounts(mockTeamId);
      });

      expect(result.current.error).toBe("Failed to fetch available accounts");
    });

    it("should clear error when fetching again", async () => {
      mockApi.get.mockRejectedValueOnce(new Error("First error"));
      mockApi.get.mockResolvedValueOnce(mockBusinessesResponse);

      const { result } = renderHook(() => useAvailableAccounts());

      // First call fails
      await act(async () => {
        await result.current.fetchAvailableAccounts(mockTeamId);
      });
      expect(result.current.error).toBe("First error");

      // Second call succeeds
      await act(async () => {
        await result.current.fetchAvailableAccounts(mockTeamId);
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe("refetch", () => {
    it("should refetch with the last team ID", async () => {
      mockApi.get.mockResolvedValue(mockBusinessesResponse);

      const { result } = renderHook(() => useAvailableAccounts());

      // First fetch
      await act(async () => {
        await result.current.fetchAvailableAccounts(mockTeamId);
      });

      expect(mockApi.get).toHaveBeenCalledTimes(1);

      // Refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockApi.get).toHaveBeenCalledTimes(2);
      expect(mockApi.get).toHaveBeenLastCalledWith(
        `/api/v1/reddit/available-accounts?teamId=${mockTeamId}`
      );
    });

    it("should not call API if no team ID was set", async () => {
      const { result } = renderHook(() => useAvailableAccounts());

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });

  describe("clearError", () => {
    it("should clear the error state", async () => {
      mockApi.get.mockRejectedValue(new Error("Test error"));

      const { result } = renderHook(() => useAvailableAccounts());

      await act(async () => {
        await result.current.fetchAvailableAccounts(mockTeamId);
      });
      expect(result.current.error).toBe("Test error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("empty businesses", () => {
    it("should handle empty businesses array", async () => {
      mockApi.get.mockResolvedValue({ businesses: [] });

      const { result } = renderHook(() => useAvailableAccounts());

      await act(async () => {
        await result.current.fetchAvailableAccounts(mockTeamId);
      });

      expect(result.current.businesses).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
