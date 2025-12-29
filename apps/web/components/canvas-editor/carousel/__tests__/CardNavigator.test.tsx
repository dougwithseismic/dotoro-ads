import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardNavigator } from '../CardNavigator';

describe('CardNavigator', () => {
  const defaultProps = {
    currentIndex: 1,
    totalCards: 5,
    onPrevious: vi.fn(),
    onNext: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation buttons', () => {
    render(<CardNavigator {...defaultProps} />);

    expect(screen.getByRole('button', { name: /previous card/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next card/i })).toBeInTheDocument();
  });

  it('shows current position indicator', () => {
    render(<CardNavigator {...defaultProps} />);

    expect(screen.getByText('2')).toBeInTheDocument(); // currentIndex + 1
    expect(screen.getByText('of')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onPrevious when previous button is clicked', () => {
    render(<CardNavigator {...defaultProps} />);

    const prevButton = screen.getByRole('button', { name: /previous card/i });
    fireEvent.click(prevButton);

    expect(defaultProps.onPrevious).toHaveBeenCalled();
  });

  it('calls onNext when next button is clicked', () => {
    render(<CardNavigator {...defaultProps} />);

    const nextButton = screen.getByRole('button', { name: /next card/i });
    fireEvent.click(nextButton);

    expect(defaultProps.onNext).toHaveBeenCalled();
  });

  it('disables previous button at start', () => {
    render(<CardNavigator {...defaultProps} currentIndex={0} />);

    const prevButton = screen.getByRole('button', { name: /previous card/i });
    expect(prevButton).toBeDisabled();
  });

  it('disables next button at end', () => {
    render(<CardNavigator {...defaultProps} currentIndex={4} totalCards={5} />);

    const nextButton = screen.getByRole('button', { name: /next card/i });
    expect(nextButton).toBeDisabled();
  });

  it('supports keyboard navigation with arrow keys', () => {
    render(<CardNavigator {...defaultProps} enableKeyboardNav={true} />);

    // Simulate left arrow
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(defaultProps.onPrevious).toHaveBeenCalled();

    // Simulate right arrow
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(defaultProps.onNext).toHaveBeenCalled();
  });

  it('respects disabled state', () => {
    render(<CardNavigator {...defaultProps} disabled={true} />);

    const prevButton = screen.getByRole('button', { name: /previous card/i });
    const nextButton = screen.getByRole('button', { name: /next card/i });

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it('returns null for empty carousel', () => {
    const { container } = render(<CardNavigator {...defaultProps} totalCards={0} />);

    expect(container.firstChild).toBeNull();
  });

  it('applies compact style when requested', () => {
    render(<CardNavigator {...defaultProps} compact={true} />);

    const nav = screen.getByRole('navigation', { name: /card navigation/i });
    // CSS modules add hash to class names, so check for the partial class name
    expect(nav.className).toMatch(/compact/);
  });
});
