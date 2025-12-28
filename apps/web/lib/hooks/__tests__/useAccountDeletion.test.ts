import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDeletionPreview, useDeleteAccount } from "../useAccountDeletion";
import * as usersApi from "@/lib/api/users";

// Mock the users API module
vi.mock("@/lib/api/users", () => ({
  fetchDeletionPreview: vi.fn(),
  deleteAccount: vi.fn(),
}));

// Mock the auth context
const mockLogout = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    logout: mockLogout,
  }),
}));

describe("useDeletionPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct initial state (not loading, no data, no error)", () => {
    const { result } = renderHook(() => useDeletionPreview());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(typeof result.current.fetchPreview).toBe("function");
  });

  it("should set loading state during fetch", async () => {
    const mockFetchDeletionPreview = vi.mocked(usersApi.fetchDeletionPreview);

    // Create a promise that we control
    let resolvePromise: (value: usersApi.DeletionPreview) => void;
    const pendingPromise = new Promise<usersApi.DeletionPreview>((resolve) => {
      resolvePromise = resolve;
    });
    mockFetchDeletionPreview.mockReturnValue(pendingPromise);

    const { result } = renderHook(() => useDeletionPreview());

    // Start the fetch
    act(() => {
      result.current.fetchPreview();
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();

    // Resolve the promise
    const mockPreview: usersApi.DeletionPreview = {
      teamsToDelete: [],
      teamsToTransfer: [],
      teamsToLeave: [],
    };

    await act(async () => {
      resolvePromise!(mockPreview);
    });

    // Should no longer be loading
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should return preview data on successful fetch", async () => {
    const mockPreview: usersApi.DeletionPreview = {
      teamsToDelete: [
        { id: "team-1", name: "Personal Team", slug: "personal", memberCount: 1 },
      ],
      teamsToTransfer: [
        {
          id: "team-2",
          name: "Acme Corp",
          slug: "acme",
          memberCount: 5,
          newOwner: { id: "user-2", email: "admin@acme.com", currentRole: "admin" },
        },
      ],
      teamsToLeave: [
        { id: "team-3", name: "Client Project", slug: "client" },
      ],
    };

    const mockFetchDeletionPreview = vi.mocked(usersApi.fetchDeletionPreview);
    mockFetchDeletionPreview.mockResolvedValue(mockPreview);

    const { result } = renderHook(() => useDeletionPreview());

    await act(async () => {
      await result.current.fetchPreview();
    });

    expect(result.current.data).toEqual(mockPreview);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockFetchDeletionPreview).toHaveBeenCalledTimes(1);
  });

  it("should set error state on failure", async () => {
    const mockFetchDeletionPreview = vi.mocked(usersApi.fetchDeletionPreview);
    mockFetchDeletionPreview.mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useDeletionPreview());

    await act(async () => {
      await result.current.fetchPreview();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("Unauthorized");
    expect(result.current.data).toBeNull();
  });

  it("should handle non-Error exceptions", async () => {
    const mockFetchDeletionPreview = vi.mocked(usersApi.fetchDeletionPreview);
    mockFetchDeletionPreview.mockRejectedValue("String error");

    const { result } = renderHook(() => useDeletionPreview());

    await act(async () => {
      await result.current.fetchPreview();
    });

    expect(result.current.error).toBe("Failed to fetch deletion preview");
  });

  it("should clear previous error on new fetch attempt", async () => {
    const mockFetchDeletionPreview = vi.mocked(usersApi.fetchDeletionPreview);

    // First call fails
    mockFetchDeletionPreview.mockRejectedValueOnce(new Error("First error"));

    const { result } = renderHook(() => useDeletionPreview());

    await act(async () => {
      await result.current.fetchPreview();
    });

    expect(result.current.error).toBe("First error");

    // Second call succeeds
    const mockPreview: usersApi.DeletionPreview = {
      teamsToDelete: [],
      teamsToTransfer: [],
      teamsToLeave: [],
    };
    mockFetchDeletionPreview.mockResolvedValueOnce(mockPreview);

    await act(async () => {
      await result.current.fetchPreview();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockPreview);
  });
});

describe("useDeleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct initial state (not loading, no error)", () => {
    const { result } = renderHook(() => useDeleteAccount());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.deleteAccount).toBe("function");
    expect(typeof result.current.reset).toBe("function");
  });

  it("should set loading state during delete", async () => {
    const mockDeleteAccount = vi.mocked(usersApi.deleteAccount);

    // Create a promise that we control
    let resolvePromise: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockDeleteAccount.mockReturnValue(pendingPromise);

    const { result } = renderHook(() => useDeleteAccount());

    // Start the delete
    act(() => {
      result.current.deleteAccount("test@example.com");
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();

    // Resolve the promise
    await act(async () => {
      resolvePromise!();
    });

    // Should no longer be loading
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should call logout on successful deletion", async () => {
    const mockDeleteAccount = vi.mocked(usersApi.deleteAccount);
    mockDeleteAccount.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteAccount());

    await act(async () => {
      await result.current.deleteAccount("test@example.com");
    });

    expect(mockDeleteAccount).toHaveBeenCalledWith("test@example.com");
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should set error state on failure and not call logout", async () => {
    const mockDeleteAccount = vi.mocked(usersApi.deleteAccount);
    mockDeleteAccount.mockRejectedValue(new Error("Email does not match"));

    const { result } = renderHook(() => useDeleteAccount());

    await act(async () => {
      await result.current.deleteAccount("wrong@example.com");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("Email does not match");
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("should handle non-Error exceptions", async () => {
    const mockDeleteAccount = vi.mocked(usersApi.deleteAccount);
    mockDeleteAccount.mockRejectedValue("String error");

    const { result } = renderHook(() => useDeleteAccount());

    await act(async () => {
      await result.current.deleteAccount("test@example.com");
    });

    expect(result.current.error).toBe("Failed to delete account");
  });

  it("should reset error and loading states", async () => {
    const mockDeleteAccount = vi.mocked(usersApi.deleteAccount);
    mockDeleteAccount.mockRejectedValue(new Error("Some error"));

    const { result } = renderHook(() => useDeleteAccount());

    // First, create an error state
    await act(async () => {
      await result.current.deleteAccount("test@example.com");
    });

    expect(result.current.error).toBe("Some error");

    // Now reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should clear previous error on new delete attempt", async () => {
    const mockDeleteAccount = vi.mocked(usersApi.deleteAccount);

    // First call fails
    mockDeleteAccount.mockRejectedValueOnce(new Error("First error"));

    const { result } = renderHook(() => useDeleteAccount());

    await act(async () => {
      await result.current.deleteAccount("test@example.com");
    });

    expect(result.current.error).toBe("First error");

    // Second call succeeds
    mockDeleteAccount.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.deleteAccount("test@example.com");
    });

    expect(result.current.error).toBeNull();
  });
});
