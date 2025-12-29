import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataRowSelector, type DataRow } from '../DataRowSelector';
import { CAROUSEL_PLATFORM_CONSTRAINTS } from '@repo/core';

describe('DataRowSelector', () => {
  const testRows: DataRow[] = [
    { id: 'row1', data: { name: 'Product A', price: 100, category: 'Electronics' } },
    { id: 'row2', data: { name: 'Product B', price: 200, category: 'Clothing' } },
    { id: 'row3', data: { name: 'Product C', price: 150, category: 'Home' } },
    { id: 'row4', data: { name: 'Product D', price: 300, category: 'Sports' } },
  ];

  const defaultProps = {
    rows: testRows,
    selectedRowIds: [] as string[],
    onSelectionChange: vi.fn(),
    constraints: CAROUSEL_PLATFORM_CONSTRAINTS.facebook,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all rows', () => {
    render(<DataRowSelector {...defaultProps} />);

    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('Product B')).toBeInTheDocument();
    expect(screen.getByText('Product C')).toBeInTheDocument();
    expect(screen.getByText('Product D')).toBeInTheDocument();
  });

  it('shows selection counter', () => {
    render(<DataRowSelector {...defaultProps} selectedRowIds={['row1', 'row2']} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('/10')).toBeInTheDocument();
  });

  it('toggles row selection on click', () => {
    render(<DataRowSelector {...defaultProps} />);

    const row = screen.getByText('Product A').closest('tr');
    if (row) {
      fireEvent.click(row);
    }

    expect(defaultProps.onSelectionChange).toHaveBeenCalledWith(['row1']);
  });

  it('deselects row when already selected', () => {
    render(<DataRowSelector {...defaultProps} selectedRowIds={['row1']} />);

    const row = screen.getByText('Product A').closest('tr');
    if (row) {
      fireEvent.click(row);
    }

    expect(defaultProps.onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('prevents selection beyond max cards', () => {
    const maxedSelection = Array.from({ length: 10 }, (_, i) => `row${i}`);
    render(<DataRowSelector {...defaultProps} selectedRowIds={maxedSelection} />);

    // Check for limit warning
    expect(screen.getByText(/maximum 10 cards reached/i)).toBeInTheDocument();
  });

  it('filters rows based on search', () => {
    render(<DataRowSelector {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/search rows/i);
    fireEvent.change(searchInput, { target: { value: 'Product A' } });

    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.queryByText('Product B')).not.toBeInTheDocument();
  });

  it('shows empty state when no matching rows', () => {
    render(<DataRowSelector {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/search rows/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText(/no matching rows found/i)).toBeInTheDocument();
  });

  it('handles select all checkbox', () => {
    render(<DataRowSelector {...defaultProps} />);

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all rows/i });
    fireEvent.click(selectAllCheckbox);

    expect(defaultProps.onSelectionChange).toHaveBeenCalledWith(
      expect.arrayContaining(['row1', 'row2', 'row3', 'row4'])
    );
  });

  it('deselects all when select all is checked', () => {
    render(
      <DataRowSelector
        {...defaultProps}
        selectedRowIds={['row1', 'row2', 'row3', 'row4']}
      />
    );

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all rows/i });
    fireEvent.click(selectAllCheckbox);

    expect(defaultProps.onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('respects disabled state', () => {
    render(<DataRowSelector {...defaultProps} disabled={true} />);

    const searchInput = screen.getByPlaceholderText(/search rows/i);
    expect(searchInput).toBeDisabled();
  });

  it('uses custom preview columns when provided', () => {
    render(
      <DataRowSelector
        {...defaultProps}
        previewColumns={['name', 'price']}
      />
    );

    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('price')).toBeInTheDocument();
    expect(screen.queryByText('category')).not.toBeInTheDocument();
  });

  it('respects Reddit max cards (6)', () => {
    const redditConstraints = CAROUSEL_PLATFORM_CONSTRAINTS.reddit;
    render(
      <DataRowSelector
        {...defaultProps}
        constraints={redditConstraints}
      />
    );

    expect(screen.getByText('/6')).toBeInTheDocument();
  });
});
