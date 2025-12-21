import type { ColumnAnalysis } from "@repo/core";

export interface StoredDataSource {
  id: string;
  name: string;
  type: string;
  headers: string[];
  columns: ColumnAnalysis[];
  rows: Record<string, unknown>[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * In-memory data store for uploaded CSV data
 * This is a temporary solution until database integration is complete
 */
class DataStore {
  private dataSources: Map<string, StoredDataSource> = new Map();

  /**
   * Store or update a data source with its parsed data
   */
  setDataSource(id: string, data: Omit<StoredDataSource, "id">): void {
    this.dataSources.set(id, { id, ...data });
  }

  /**
   * Get a data source by ID
   */
  getDataSource(id: string): StoredDataSource | undefined {
    return this.dataSources.get(id);
  }

  /**
   * Check if a data source exists
   */
  hasDataSource(id: string): boolean {
    return this.dataSources.has(id);
  }

  /**
   * Get paginated rows for a data source
   */
  getRows(
    id: string,
    page: number,
    limit: number
  ): { rows: Record<string, unknown>[]; total: number } {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      return { rows: [], total: 0 };
    }

    const start = (page - 1) * limit;
    const rows = dataSource.rows.slice(start, start + limit);
    return { rows, total: dataSource.rows.length };
  }

  /**
   * Update rows for a data source
   */
  updateRows(id: string, rows: Record<string, unknown>[]): void {
    const dataSource = this.dataSources.get(id);
    if (dataSource) {
      dataSource.rows = rows;
      dataSource.updatedAt = new Date();
    }
  }

  /**
   * Delete a data source
   */
  deleteDataSource(id: string): boolean {
    return this.dataSources.delete(id);
  }

  /**
   * Clear all data (useful for testing)
   */
  clear(): void {
    this.dataSources.clear();
  }

  /**
   * Get all data source IDs (useful for debugging)
   */
  getAllIds(): string[] {
    return Array.from(this.dataSources.keys());
  }
}

// Export a singleton instance
export const dataStore = new DataStore();

// Also export the class for testing
export { DataStore };
