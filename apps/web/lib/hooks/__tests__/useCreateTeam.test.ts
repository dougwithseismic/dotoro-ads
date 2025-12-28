/**
 * Tests for useCreateTeam hook
 *
 * This hook wraps the createTeam API function and manages loading, error, and success states.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCreateTeam } from "../useCreateTeam";
import * as teamsApi from "@/lib/teams/api";
import type { TeamDetail } from "@/lib/teams/types";

// Mock the teams API
vi.mock("@/lib/teams/api", () => ({
  createTeam: vi.fn(),
}));

const mockTeamDetail: TeamDetail = {
  id: "team-123",
  name: "Test Team",
  slug: "test-team",
  description: "A test team",
  avatarUrl: null,
  plan: "free",
  memberCount: 1,
  role: "owner",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  settings: null,
  billingEmail: null,
};

describe("useCreateTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial state correctly", () => {
    const { result } = renderHook(() => useCreateTeam());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.createTeam).toBe("function");
    expect(typeof result.current.reset).toBe("function");
  });

  it("sets isLoading to true during API call", async () => {
    // Create a promise that we can control
    let resolvePromise: (value: TeamDetail) => void;
    const promise = new Promise<TeamDetail>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(teamsApi.createTeam).mockReturnValue(promise);

    const { result } = renderHook(() => useCreateTeam());

    // Start the create operation
    act(() => {
      result.current.createTeam({ name: "Test Team" });
    });

    // Check loading state immediately
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);

    // Resolve the promise
    await act(async () => {
      resolvePromise!(mockTeamDetail);
      await promise;
    });

    // Loading should be false after completion
    expect(result.current.isLoading).toBe(false);
  });

  it("returns team data on successful creation", async () => {
    vi.mocked(teamsApi.createTeam).mockResolvedValue(mockTeamDetail);

    const { result } = renderHook(() => useCreateTeam());

    let returnedTeam: TeamDetail | undefined;

    await act(async () => {
      returnedTeam = await result.current.createTeam({ name: "Test Team" });
    });

    expect(returnedTeam).toEqual(mockTeamDetail);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("calls API with correct input", async () => {
    vi.mocked(teamsApi.createTeam).mockResolvedValue(mockTeamDetail);

    const { result } = renderHook(() => useCreateTeam());

    const input = {
      name: "My Team",
      slug: "my-team",
      description: "Team description",
    };

    await act(async () => {
      await result.current.createTeam(input);
    });

    expect(teamsApi.createTeam).toHaveBeenCalledWith(input);
    expect(teamsApi.createTeam).toHaveBeenCalledTimes(1);
  });

  it("sets error state when API call fails", async () => {
    const errorMessage = "Team slug is already taken";
    vi.mocked(teamsApi.createTeam).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useCreateTeam());

    await act(async () => {
      try {
        await result.current.createTeam({ name: "Test Team" });
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });

  it("throws error on API failure", async () => {
    const errorMessage = "Network error";
    vi.mocked(teamsApi.createTeam).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useCreateTeam());

    await expect(
      act(async () => {
        await result.current.createTeam({ name: "Test Team" });
      })
    ).rejects.toThrow(errorMessage);
  });

  it("handles non-Error rejection gracefully", async () => {
    vi.mocked(teamsApi.createTeam).mockRejectedValue("Something went wrong");

    const { result } = renderHook(() => useCreateTeam());

    await act(async () => {
      try {
        await result.current.createTeam({ name: "Test Team" });
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe("Failed to create team");
  });

  it("resets state when reset is called", async () => {
    const errorMessage = "Team slug is already taken";
    vi.mocked(teamsApi.createTeam).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useCreateTeam());

    // Trigger an error
    await act(async () => {
      try {
        await result.current.createTeam({ name: "Test Team" });
      } catch {
        // Expected
      }
    });

    expect(result.current.error).toBe(errorMessage);

    // Reset the state
    act(() => {
      result.current.reset();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("clears previous error on new create attempt", async () => {
    const errorMessage = "First error";
    vi.mocked(teamsApi.createTeam)
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce(mockTeamDetail);

    const { result } = renderHook(() => useCreateTeam());

    // First attempt fails
    await act(async () => {
      try {
        await result.current.createTeam({ name: "Test Team" });
      } catch {
        // Expected
      }
    });

    expect(result.current.error).toBe(errorMessage);

    // Second attempt succeeds
    await act(async () => {
      await result.current.createTeam({ name: "Test Team" });
    });

    expect(result.current.error).toBe(null);
  });
});
