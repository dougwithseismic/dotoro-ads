/**
 * AsyncState - Discriminated Union for Async Operations
 *
 * A type-safe representation of async state that prevents invalid combinations
 * like having both loading=true and error set simultaneously.
 *
 * @example
 * ```typescript
 * const [state, setState] = useState<AsyncState<User>>({ status: 'idle' });
 *
 * // Start loading
 * setState({ status: 'loading' });
 *
 * // Success
 * setState({ status: 'success', data: user });
 *
 * // Error
 * setState({ status: 'error', error: 'Failed to load user' });
 *
 * // Type-safe access
 * if (isSuccess(state)) {
 *   console.log(state.data); // TypeScript knows data exists
 * }
 * ```
 */

/**
 * Discriminated union type for async state
 *
 * @template T - The type of data on success
 * @template E - The type of error (defaults to string)
 */
export type AsyncState<T, E = string> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: E }
  | { status: "success"; data: T };

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if state is idle (not yet started)
 */
export function isIdle<T, E = string>(
  state: AsyncState<T, E>
): state is { status: "idle" } {
  return state.status === "idle";
}

/**
 * Check if state is loading
 */
export function isLoading<T, E = string>(
  state: AsyncState<T, E>
): state is { status: "loading" } {
  return state.status === "loading";
}

/**
 * Check if state is an error
 */
export function isError<T, E = string>(
  state: AsyncState<T, E>
): state is { status: "error"; error: E } {
  return state.status === "error";
}

/**
 * Check if state is successful
 */
export function isSuccess<T, E = string>(
  state: AsyncState<T, E>
): state is { status: "success"; data: T } {
  return state.status === "success";
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Map over the success value of an AsyncState
 *
 * @example
 * ```typescript
 * const userState: AsyncState<User> = { status: 'success', data: user };
 * const nameState = mapSuccess(userState, u => u.name);
 * // nameState: AsyncState<string>
 * ```
 */
export function mapSuccess<T, U, E = string>(
  state: AsyncState<T, E>,
  fn: (data: T) => U
): AsyncState<U, E> {
  if (state.status === "success") {
    return { status: "success", data: fn(state.data) };
  }
  return state as AsyncState<U, E>;
}

/**
 * Get the data from a success state, or return a default value
 *
 * @example
 * ```typescript
 * const userState: AsyncState<User> = { status: 'loading' };
 * const user = getDataOrDefault(userState, defaultUser);
 * ```
 */
export function getDataOrDefault<T, E = string>(
  state: AsyncState<T, E>,
  defaultValue: T
): T {
  if (state.status === "success") {
    return state.data;
  }
  return defaultValue;
}

/**
 * Get the data from a success state, or return null
 */
export function getDataOrNull<T, E = string>(
  state: AsyncState<T, E>
): T | null {
  if (state.status === "success") {
    return state.data;
  }
  return null;
}

/**
 * Get the error from an error state, or return null
 */
export function getErrorOrNull<T, E = string>(
  state: AsyncState<T, E>
): E | null {
  if (state.status === "error") {
    return state.error;
  }
  return null;
}

/**
 * Create an idle state
 */
export function idle<T, E = string>(): AsyncState<T, E> {
  return { status: "idle" };
}

/**
 * Create a loading state
 */
export function loading<T, E = string>(): AsyncState<T, E> {
  return { status: "loading" };
}

/**
 * Create an error state
 */
export function error<T, E = string>(err: E): AsyncState<T, E> {
  return { status: "error", error: err };
}

/**
 * Create a success state
 */
export function success<T, E = string>(data: T): AsyncState<T, E> {
  return { status: "success", data };
}

// ============================================================================
// Convenience Helpers Object
// ============================================================================

/**
 * AsyncState helper object for creating states
 *
 * @example
 * ```typescript
 * import { AsyncStateHelpers as AS } from '@/lib/types';
 *
 * setState(AS.loading());
 * setState(AS.success(data));
 * setState(AS.error('Failed'));
 * ```
 */
export const AsyncStateHelpers = {
  idle,
  loading,
  error,
  success,
  isIdle,
  isLoading,
  isError,
  isSuccess,
  mapSuccess,
  getDataOrDefault,
  getDataOrNull,
  getErrorOrNull,
} as const;
