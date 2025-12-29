/**
 * ImageVariableBinding Tests
 *
 * Tests for the component that allows binding image layers
 * to data source variables for dynamic content generation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageVariableBinding } from '../ImageVariableBinding';
import styles from '../ImageVariableBinding.module.css';

describe('ImageVariableBinding', () => {
  const defaultProps = {
    availableColumns: ['product_image', 'hero_image', 'thumbnail', 'logo'],
    currentBinding: null as string | null,
    fallbackImageUrl: '',
    onBindVariable: vi.fn(),
    onUnbind: vi.fn(),
    onSelectFallback: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the panel title', () => {
      render(<ImageVariableBinding {...defaultProps} />);

      expect(screen.getByText('Image Source')).toBeInTheDocument();
    });

    it('should render source type toggle buttons', () => {
      render(<ImageVariableBinding {...defaultProps} />);

      expect(screen.getByRole('button', { name: /static image/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /variable/i })).toBeInTheDocument();
    });

    it('should have Static Image as default selected source type', () => {
      render(<ImageVariableBinding {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const staticButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('static'));
      expect(staticButton?.className).toContain(styles.active);
    });

    it('should not show variable selector when Static Image is selected', () => {
      render(<ImageVariableBinding {...defaultProps} />);

      expect(screen.queryByLabelText(/data column/i)).not.toBeInTheDocument();
    });
  });

  describe('Source Type Toggle', () => {
    it('should switch to Variable mode when Variable button is clicked', () => {
      render(<ImageVariableBinding {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const variableButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('variable'));

      expect(variableButton).toBeDefined();
      fireEvent.click(variableButton!);

      expect(variableButton!.className).toContain(styles.active);
      expect(screen.getByLabelText(/data column/i)).toBeInTheDocument();
    });

    it('should switch back to Static mode', () => {
      render(<ImageVariableBinding {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const variableButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('variable'));
      const staticButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('static'));

      // Switch to Variable
      fireEvent.click(variableButton!);

      // Switch back to Static
      fireEvent.click(staticButton!);

      expect(staticButton!.className).toContain(styles.active);
      expect(screen.queryByLabelText(/data column/i)).not.toBeInTheDocument();
    });

    it('should call onUnbind when switching from Variable to Static with current binding', () => {
      const onUnbind = vi.fn();
      // Need to have a currentBinding for onUnbind to be called when switching back
      render(<ImageVariableBinding {...defaultProps} currentBinding="product_image" onUnbind={onUnbind} />);

      const buttons = screen.getAllByRole('button');
      const staticButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('static'));

      // Switch to Static (should call onUnbind since we have a binding)
      fireEvent.click(staticButton!);

      expect(onUnbind).toHaveBeenCalled();
    });
  });

  describe('Variable Selection', () => {
    it('should render column dropdown when in Variable mode', () => {
      render(<ImageVariableBinding {...defaultProps} />);

      // Switch to Variable mode
      const buttons = screen.getAllByRole('button');
      const variableButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('variable'));
      fireEvent.click(variableButton!);

      const select = screen.getByLabelText(/data column/i);
      expect(select).toBeInTheDocument();
    });

    it('should show all available columns in dropdown', () => {
      render(<ImageVariableBinding {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const variableButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('variable'));
      fireEvent.click(variableButton!);

      for (const column of defaultProps.availableColumns) {
        expect(screen.getByRole('option', { name: column })).toBeInTheDocument();
      }
    });

    it('should show placeholder option', () => {
      render(<ImageVariableBinding {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const variableButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('variable'));
      fireEvent.click(variableButton!);

      expect(screen.getByRole('option', { name: /select column/i })).toBeInTheDocument();
    });

    it('should call onBindVariable when column is selected', () => {
      const onBindVariable = vi.fn();
      render(<ImageVariableBinding {...defaultProps} onBindVariable={onBindVariable} />);

      const buttons = screen.getAllByRole('button');
      const variableButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('variable'));
      fireEvent.click(variableButton!);

      const select = screen.getByLabelText(/data column/i);
      fireEvent.change(select, { target: { value: 'product_image' } });

      expect(onBindVariable).toHaveBeenCalledWith('product_image');
    });
  });

  describe('Current Binding State', () => {
    it('should auto-select Variable mode when currentBinding is set', () => {
      render(<ImageVariableBinding {...defaultProps} currentBinding="product_image" />);

      const buttons = screen.getAllByRole('button');
      const variableButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('variable'));
      expect(variableButton?.className).toContain(styles.active);
    });

    it('should show the bound column as selected', () => {
      render(<ImageVariableBinding {...defaultProps} currentBinding="product_image" />);

      const select = screen.getByLabelText(/data column/i);
      expect(select).toHaveValue('product_image');
    });

    it('should show binding indicator when bound', () => {
      render(<ImageVariableBinding {...defaultProps} currentBinding="product_image" />);

      expect(screen.getByText(/bound to/i)).toBeInTheDocument();
      expect(screen.getByText(/\{product_image\}/i)).toBeInTheDocument();
    });
  });

  describe('Fallback Image', () => {
    it('should show fallback image button when in Variable mode', () => {
      render(<ImageVariableBinding {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const variableButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('variable'));
      fireEvent.click(variableButton!);

      expect(screen.getByText(/set fallback image/i)).toBeInTheDocument();
    });

    it('should not show fallback button in Static mode', () => {
      render(<ImageVariableBinding {...defaultProps} />);

      expect(screen.queryByText(/set fallback image/i)).not.toBeInTheDocument();
    });

    it('should call onSelectFallback when fallback button is clicked', () => {
      const onSelectFallback = vi.fn();
      render(<ImageVariableBinding {...defaultProps} onSelectFallback={onSelectFallback} />);

      const buttons = screen.getAllByRole('button');
      const variableButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('variable'));
      fireEvent.click(variableButton!);

      const fallbackButton = screen.getByText(/set fallback image/i);
      fireEvent.click(fallbackButton);

      expect(onSelectFallback).toHaveBeenCalled();
    });

    it('should show fallback preview when fallbackImageUrl is set', () => {
      render(
        <ImageVariableBinding
          {...defaultProps}
          currentBinding="product_image"
          fallbackImageUrl="https://example.com/fallback.jpg"
        />
      );

      expect(screen.getByAltText(/fallback image/i)).toBeInTheDocument();
      expect(screen.getByAltText(/fallback image/i)).toHaveAttribute(
        'src',
        'https://example.com/fallback.jpg'
      );
    });

    it('should show change fallback button when fallback is set', () => {
      render(
        <ImageVariableBinding
          {...defaultProps}
          currentBinding="product_image"
          fallbackImageUrl="https://example.com/fallback.jpg"
        />
      );

      expect(screen.getByText(/change fallback/i)).toBeInTheDocument();
    });
  });

  describe('Empty Columns State', () => {
    it('should show message when no columns are available', () => {
      render(<ImageVariableBinding {...defaultProps} availableColumns={[]} />);

      const buttons = screen.getAllByRole('button');
      const variableButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('variable'));
      fireEvent.click(variableButton!);

      expect(screen.getByText(/no data columns available/i)).toBeInTheDocument();
    });

    it('should disable column selector when no columns available', () => {
      render(<ImageVariableBinding {...defaultProps} availableColumns={[]} />);

      const buttons = screen.getAllByRole('button');
      const variableButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('variable'));
      fireEvent.click(variableButton!);

      const select = screen.getByLabelText(/data column/i);
      expect(select).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-pressed on toggle buttons', () => {
      render(<ImageVariableBinding {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const staticButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('static'));
      const variableButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('variable'));

      expect(staticButton).toHaveAttribute('aria-pressed', 'true');
      expect(variableButton).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(variableButton!);

      expect(staticButton).toHaveAttribute('aria-pressed', 'false');
      expect(variableButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have proper label association for select', () => {
      render(<ImageVariableBinding {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const variableButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('variable'));
      fireEvent.click(variableButton!);

      const label = screen.getByText('Data Column');
      const select = screen.getByLabelText(/data column/i);

      expect(label).toHaveAttribute('for', select.id);
    });
  });

  describe('Styling States', () => {
    it('should apply panel class name', () => {
      const { container } = render(
        <ImageVariableBinding {...defaultProps} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should show variable mode indicator styling when bound', () => {
      render(<ImageVariableBinding {...defaultProps} currentBinding="product_image" />);

      // The binding badge should have specific styling
      const badge = screen.getByText(/\{product_image\}/i).closest('div');
      expect(badge?.className).toContain(styles.bindingBadge);
    });
  });
});
