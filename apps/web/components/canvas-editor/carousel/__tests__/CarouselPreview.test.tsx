import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CarouselPreview } from '../CarouselPreview';
import { createCarouselCard } from '@repo/core';

describe('CarouselPreview', () => {
  const createTestCards = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      createCarouselCard(i, { width: 1080, height: 1080 })
    );

  const defaultProps = {
    cards: createTestCards(5),
    platform: 'facebook' as const,
    renderCard: (card: { id: string }) => <div data-testid={`card-${card.id}`}>Card Content</div>,
  };

  it('renders carousel with correct platform label', () => {
    render(<CarouselPreview {...defaultProps} />);

    expect(screen.getByText(/facebook preview/i)).toBeInTheDocument();
  });

  it('renders Reddit preview style', () => {
    render(<CarouselPreview {...defaultProps} platform="reddit" />);

    expect(screen.getByText(/reddit preview/i)).toBeInTheDocument();
  });

  it('shows navigation dots for multiple cards', () => {
    render(<CarouselPreview {...defaultProps} showDots={true} />);

    const dots = screen.getAllByRole('tab');
    expect(dots).toHaveLength(5);
  });

  it('hides dots when showDots is false', () => {
    render(<CarouselPreview {...defaultProps} showDots={false} />);

    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('shows navigation arrows', () => {
    render(<CarouselPreview {...defaultProps} showArrows={true} />);

    expect(screen.getByRole('button', { name: /previous card/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next card/i })).toBeInTheDocument();
  });

  it('hides arrows when showArrows is false', () => {
    render(<CarouselPreview {...defaultProps} showArrows={false} />);

    expect(screen.queryByRole('button', { name: /previous card/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next card/i })).not.toBeInTheDocument();
  });

  it('navigates to next card on arrow click', () => {
    render(<CarouselPreview {...defaultProps} />);

    const nextButton = screen.getByRole('button', { name: /next card/i });
    fireEvent.click(nextButton);

    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('navigates to previous card on arrow click', () => {
    render(<CarouselPreview {...defaultProps} />);

    // Go to card 2 first
    const nextButton = screen.getByRole('button', { name: /next card/i });
    fireEvent.click(nextButton);

    // Then go back
    const prevButton = screen.getByRole('button', { name: /previous card/i });
    fireEvent.click(prevButton);

    expect(screen.getByText('1 / 5')).toBeInTheDocument();
  });

  it('navigates to specific card on dot click', () => {
    render(<CarouselPreview {...defaultProps} showDots={true} />);

    const dots = screen.getAllByRole('tab');
    fireEvent.click(dots[2]); // Click third dot

    expect(screen.getByText('3 / 5')).toBeInTheDocument();
  });

  it('displays card indicator', () => {
    render(<CarouselPreview {...defaultProps} />);

    expect(screen.getByText('1 / 5')).toBeInTheDocument();
  });

  it('shows empty state when no cards', () => {
    render(<CarouselPreview {...defaultProps} cards={[]} />);

    expect(screen.getByText(/no cards to preview/i)).toBeInTheDocument();
  });

  it('renders card content', () => {
    const cards = createTestCards(2);
    render(<CarouselPreview {...defaultProps} cards={cards} />);

    expect(screen.getAllByText('Card Content')).toHaveLength(2);
  });

  it('shows card metadata when provided', () => {
    const cards = createTestCards(2).map((card, i) => ({
      ...card,
      headline: `Headline ${i + 1}`,
      description: `Description ${i + 1}`,
    }));

    render(<CarouselPreview {...defaultProps} cards={cards} />);

    expect(screen.getByText('Headline 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
  });

  it('hides navigation for single card', () => {
    const singleCard = createTestCards(1);
    render(<CarouselPreview {...defaultProps} cards={singleCard} />);

    expect(screen.queryByRole('button', { name: /previous card/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next card/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation', () => {
    const { container } = render(<CarouselPreview {...defaultProps} />);

    const carouselRegion = container.querySelector('[role="region"]');
    if (carouselRegion) {
      // Right arrow key
      fireEvent.keyDown(carouselRegion, { key: 'ArrowRight' });
      expect(screen.getByText('2 / 5')).toBeInTheDocument();

      // Left arrow key
      fireEvent.keyDown(carouselRegion, { key: 'ArrowLeft' });
      expect(screen.getByText('1 / 5')).toBeInTheDocument();
    }
  });
});
