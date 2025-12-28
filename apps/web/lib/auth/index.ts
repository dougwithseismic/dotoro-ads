// Auth exports
export { AuthProvider, useAuth, useRequireAuth } from "./context.js";
export { requestMagicLink, verifyMagicLink, getSession, logout } from "./api.js";
export type {
  User,
  SessionResponse,
  MagicLinkRequestResponse,
  MagicLinkVerifyResponse,
  AuthContextValue,
} from "./types.js";
