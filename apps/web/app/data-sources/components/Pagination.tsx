"use client";

import styles from "./Pagination.module.css";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZES = [10, 25, 50];

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPageSizeChange(Number(e.target.value));
  };

  return (
    <nav className={styles.container} aria-label="Pagination">
      <div className={styles.info}>
        <span className={styles.showing}>
          Showing {startItem}-{endItem} of {totalItems}
        </span>
      </div>

      <div className={styles.controls}>
        <div className={styles.pageSize}>
          <label htmlFor="page-size" className={styles.label}>
            Rows per page:
          </label>
          <select
            id="page-size"
            value={pageSize}
            onChange={handlePageSizeChange}
            className={styles.select}
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {totalPages > 1 && (
          <div className={styles.navigation}>
            <button
              onClick={handlePrevious}
              disabled={currentPage === 1}
              className={styles.button}
              aria-label="Previous page"
            >
              Previous
            </button>

            <span className={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className={styles.button}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
