/**
 * JSON Flattening Utility
 *
 * Transforms nested JSON structures into flat, tabular rows suitable for data sources.
 * Supports various array handling modes and respects maximum nesting depth.
 */

/**
 * Configuration for JSON flattening behavior
 */
export interface JsonFlattenConfig {
  /**
   * JSONPath to the array of items to flatten (e.g., "data.items", "results").
   * If not provided, the root data is used directly.
   */
  dataPath?: string;

  /**
   * Maximum nesting depth for flattening objects.
   * Objects nested deeper than this will be kept as-is.
   * @default 3
   */
  maxDepth?: number;

  /**
   * How to handle arrays within objects:
   * - 'join': Concatenate array elements into a string
   * - 'first': Take only the first element
   * - 'expand': Create separate rows for each array element (cartesian product)
   */
  arrayHandling: "join" | "first" | "expand";

  /**
   * Separator for 'join' mode.
   * @default ", "
   */
  arraySeparator?: string;
}

type FlatObject = Record<string, unknown>;

/**
 * Navigates to a nested path in an object using dot notation.
 *
 * @param data - The root object to navigate
 * @param path - Dot-separated path (e.g., "data.items")
 * @returns The value at the path, or undefined if not found
 */
function getValueAtPath(data: unknown, path: string): unknown {
  if (!path) return data;

  const parts = path.split(".");
  let current: unknown = data;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Checks if a value is a plain object (not null, not array, not Date, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

/**
 * Detects circular references in an object.
 * Throws an error if a circular reference is found.
 */
function detectCircularReference(
  obj: unknown,
  seen = new WeakSet<object>()
): void {
  if (obj === null || typeof obj !== "object") {
    return;
  }

  if (seen.has(obj as object)) {
    throw new Error("Circular reference detected in input data");
  }

  seen.add(obj as object);

  if (Array.isArray(obj)) {
    for (const item of obj) {
      detectCircularReference(item, seen);
    }
  } else {
    for (const value of Object.values(obj)) {
      detectCircularReference(value, seen);
    }
  }
}

/**
 * Converts a value to a string for joining in arrays.
 *
 * @param value - The value to convert
 * @returns String representation suitable for joining
 */
function valueToString(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Flattens an object for 'first' mode, including flattening the first element of arrays.
 *
 * @param obj - Object to flatten
 * @param config - Configuration options
 * @param prefix - Current key prefix (dot-notation path so far)
 * @param depth - Current depth level (0 = top level of input object)
 */
function flattenObjectForFirstMode(
  obj: Record<string, unknown>,
  config: JsonFlattenConfig,
  prefix: string = "",
  depth: number = 0
): FlatObject {
  const maxDepth = config.maxDepth ?? 3;
  const result: FlatObject = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    // Calculate the new depth after adding this key
    const newDepth = depth + 1;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        result[newKey] = null;
      } else {
        const firstElement = value[0];
        if (isPlainObject(firstElement) && newDepth < maxDepth) {
          // Flatten the first object element with the array key as prefix
          const flattened = flattenObjectForFirstMode(
            firstElement,
            config,
            newKey,
            newDepth
          );
          Object.assign(result, flattened);
        } else {
          result[newKey] = firstElement;
        }
      }
    } else if (isPlainObject(value)) {
      // Stop flattening if we've reached maxDepth
      if (newDepth >= maxDepth) {
        result[newKey] = value;
      } else if (Object.keys(value).length === 0) {
        result[newKey] = value;
      } else {
        const flattened = flattenObjectForFirstMode(
          value,
          config,
          newKey,
          newDepth
        );
        Object.assign(result, flattened);
      }
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Flattens an object for 'join' mode.
 *
 * @param obj - Object to flatten
 * @param config - Configuration options
 * @param prefix - Current key prefix (dot-notation path so far)
 * @param depth - Current depth level (0 = top level of input object)
 */
function flattenObjectForJoinMode(
  obj: Record<string, unknown>,
  config: JsonFlattenConfig,
  prefix: string = "",
  depth: number = 0
): FlatObject {
  const maxDepth = config.maxDepth ?? 3;
  const separator = config.arraySeparator ?? ", ";
  const result: FlatObject = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    // Calculate the new depth after adding this key
    const newDepth = depth + 1;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        result[newKey] = "";
      } else {
        result[newKey] = value.map(valueToString).join(separator);
      }
    } else if (isPlainObject(value)) {
      // Stop flattening if we've reached maxDepth
      if (newDepth >= maxDepth) {
        result[newKey] = value;
      } else if (Object.keys(value).length === 0) {
        result[newKey] = value;
      } else {
        const flattened = flattenObjectForJoinMode(
          value,
          config,
          newKey,
          newDepth
        );
        Object.assign(result, flattened);
      }
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Expands arrays into multiple rows using cartesian product.
 *
 * @param obj - Object to flatten
 * @param config - Configuration options
 * @param prefix - Current key prefix (dot-notation path so far)
 * @param depth - Current depth level (0 = top level of input object)
 */
function flattenObjectForExpandMode(
  obj: Record<string, unknown>,
  config: JsonFlattenConfig,
  prefix: string = "",
  depth: number = 0
): FlatObject[] {
  const maxDepth = config.maxDepth ?? 3;

  // First, collect all entries and identify arrays that need expansion
  const entries: Array<{
    key: string;
    values: unknown[];
    isArray: boolean;
    isObjectArray: boolean;
  }> = [];

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    // Calculate the new depth after adding this key
    const newDepth = depth + 1;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        // Empty array - this will cause zero rows
        entries.push({ key: newKey, values: [], isArray: true, isObjectArray: false });
      } else {
        const isObjectArray = value.every(isPlainObject);
        entries.push({
          key: newKey,
          values: value,
          isArray: true,
          isObjectArray,
        });
      }
    } else if (isPlainObject(value)) {
      // Stop flattening if we've reached maxDepth
      if (newDepth >= maxDepth || Object.keys(value).length === 0) {
        entries.push({
          key: newKey,
          values: [value],
          isArray: false,
          isObjectArray: false,
        });
      } else {
        // Recursively flatten nested object for expand mode
        const nestedResults = flattenObjectForExpandMode(
          value,
          config,
          newKey,
          newDepth
        );
        // For non-array nested objects, we need to merge their results
        entries.push({
          key: "__nested__" + newKey,
          values: nestedResults,
          isArray: false,
          isObjectArray: true,
        });
      }
    } else {
      entries.push({
        key: newKey,
        values: [value],
        isArray: false,
        isObjectArray: false,
      });
    }
  }

  // Check if any array is empty - if so, return empty result
  for (const entry of entries) {
    if (entry.isArray && entry.values.length === 0) {
      return [];
    }
  }

  // Build cartesian product
  let results: FlatObject[] = [{}];

  for (const entry of entries) {
    if (entry.key.startsWith("__nested__")) {
      // Merge nested object results
      const newResults: FlatObject[] = [];
      for (const current of results) {
        for (const nestedResult of entry.values as FlatObject[]) {
          newResults.push({ ...current, ...nestedResult });
        }
      }
      results = newResults;
    } else if (entry.isArray) {
      const newResults: FlatObject[] = [];
      for (const current of results) {
        for (const val of entry.values) {
          if (entry.isObjectArray && isPlainObject(val)) {
            // Flatten object array element
            const flattened = flattenObjectForExpandMode(
              val,
              config,
              entry.key,
              depth + 1
            );
            for (const flat of flattened) {
              newResults.push({ ...current, ...flat });
            }
          } else {
            newResults.push({ ...current, [entry.key]: val });
          }
        }
      }
      results = newResults;
    } else {
      // Single value - add to all current results
      for (const current of results) {
        current[entry.key] = entry.values[0];
      }
    }
  }

  return results;
}

/**
 * Flattens nested JSON data into tabular rows.
 *
 * @param data - The input JSON data (object or array)
 * @param config - Configuration for flattening behavior
 * @returns Array of flattened objects with dot-notation keys
 *
 * @example
 * ```typescript
 * const data = {
 *   data: {
 *     items: [
 *       { id: 1, product: { name: "Widget", price: 29.99 }, tags: ["sale", "new"] }
 *     ]
 *   }
 * };
 *
 * const result = flattenJson(data, {
 *   dataPath: "data.items",
 *   arrayHandling: "join"
 * });
 *
 * // Result:
 * // [{ id: 1, "product.name": "Widget", "product.price": 29.99, tags: "sale, new" }]
 * ```
 */
export function flattenJson(
  data: unknown,
  config: JsonFlattenConfig
): FlatObject[] {
  // Handle null/undefined input
  if (data === null || data === undefined) {
    return [];
  }

  // Handle primitive types at root
  if (typeof data !== "object") {
    return [];
  }

  // Detect circular references before processing
  detectCircularReference(data);

  // Extract data at path if specified
  let targetData: unknown = data;
  if (config.dataPath) {
    targetData = getValueAtPath(data, config.dataPath);
    if (targetData === undefined) {
      return [];
    }
  }

  // Handle primitives at path
  if (typeof targetData !== "object" || targetData === null) {
    return [];
  }

  // Normalize to array
  let items: unknown[];
  if (Array.isArray(targetData)) {
    items = targetData;
  } else if (isPlainObject(targetData)) {
    items = [targetData];
  } else {
    return [];
  }

  // Handle empty array
  if (items.length === 0) {
    return [];
  }

  // Flatten each item based on array handling mode
  const results: FlatObject[] = [];

  for (const item of items) {
    if (!isPlainObject(item)) {
      // Skip non-object items in the array
      continue;
    }

    switch (config.arrayHandling) {
      case "join":
        results.push(flattenObjectForJoinMode(item, config));
        break;

      case "first":
        results.push(flattenObjectForFirstMode(item, config));
        break;

      case "expand":
        const expanded = flattenObjectForExpandMode(item, config);
        results.push(...expanded);
        break;
    }
  }

  return results;
}
