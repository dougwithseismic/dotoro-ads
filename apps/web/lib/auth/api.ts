"use client";

import type {
  SessionResponse,
  MagicLinkRequestResponse,
  MagicLinkVerifyResponse,
} from "./types.js";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Request a magic link to be sent to the email
 */
export async function requestMagicLink(email: string): Promise<MagicLinkRequestResponse> {
  const response = await fetch(`${API_BASE}/api/auth/magic-link/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Failed to request magic link");
  }

  return response.json();
}

/**
 * Verify a magic link token
 */
export async function verifyMagicLink(token: string): Promise<MagicLinkVerifyResponse> {
  const response = await fetch(`${API_BASE}/api/auth/magic-link/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Verification failed" }));
    throw new Error(error.error || "Failed to verify magic link");
  }

  return response.json();
}

/**
 * Get the current session
 */
export async function getSession(): Promise<SessionResponse> {
  const response = await fetch(`${API_BASE}/api/auth/session`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    return { user: null, expiresAt: null };
  }

  return response.json();
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
