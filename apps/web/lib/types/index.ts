/**
 * Shared Types Module
 *
 * Re-exports common types and utilities used across the application.
 */

export {
  type AsyncState,
  isIdle,
  isLoading,
  isError,
  isSuccess,
  mapSuccess,
  getDataOrDefault,
  getDataOrNull,
  getErrorOrNull,
  idle,
  loading,
  error,
  success,
  AsyncStateHelpers,
} from "./async-state";
