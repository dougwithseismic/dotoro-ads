import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CarouselCardList } from '../CarouselCardList';
import { createCarouselCard, CAROUSEL_PLATFORM_CONSTRAINTS } from '@repo/core';

describe('CarouselCardList', () => {
  const createTestCards = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      createCarouselCard(i, { width: 1080, height: 1080 })
    );

  const defaultProps = {
    cards: createTestCards(3),
    selectedCardId: null,
    onSelectCard: vi.fn(),
    onAddCard: vi.fn(),
    constraints: CAROUSEL_PLATFORM_CONSTRAINTS.facebook,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all cards', () => {
    render(<CarouselCardList {...defaultProps} />);

    // Check for card numbers
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows card count indicator', () => {
    render(<CarouselCardList {...defaultProps} />);

    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('marks selected card', () => {
    const cards = createTestCards(3);
    render(
      <CarouselCardList
        {...defaultProps}
        cards={cards}
        selectedCardId={cards[1].id}
      />
    );

    const selectedCard = screen.getByRole('option', { selected: true });
    expect(selectedCard).toBeInTheDocument();
  });

  it('calls onSelectCard when card is clicked', () => {
    const cards = createTestCards(3);
    render(<CarouselCardList {...defaultProps} cards={cards} />);

    const secondCard = screen.getByText('2').closest('[role="option"]');
    if (secondCard) {
      fireEvent.click(secondCard);
    }

    expect(defaultProps.onSelectCard).toHaveBeenCalledWith(cards[1].id);
  });

  it('shows add button when under max cards', () => {
    render(<CarouselCardList {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: /add new card/i });
    expect(addButton).toBeInTheDocument();
  });

  it('hides add button when at max cards', () => {
    const cards = createTestCards(10); // Facebook max
    render(<CarouselCardList {...defaultProps} cards={cards} />);

    expect(screen.queryByRole('button', { name: /add new card/i })).not.toBeInTheDocument();
  });

  it('calls onAddCard when add button is clicked', () => {
    render(<CarouselCardList {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: /add new card/i });
    fireEvent.click(addButton);

    expect(defaultProps.onAddCard).toHaveBeenCalled();
  });

  it('respects disabled state', () => {
    render(<CarouselCardList {...defaultProps} disabled={true} />);

    const addButton = screen.getByRole('button', { name: /add new card/i });
    expect(addButton).toBeDisabled();
  });

  it('supports keyboard selection', () => {
    const cards = createTestCards(3);
    render(<CarouselCardList {...defaultProps} cards={cards} />);

    const firstCard = screen.getByText('1').closest('[role="option"]');
    if (firstCard) {
      fireEvent.keyDown(firstCard, { key: 'Enter' });
    }

    expect(defaultProps.onSelectCard).toHaveBeenCalledWith(cards[0].id);
  });

  it('shows cards in correct order', () => {
    const cards = [
      { ...createCarouselCard(2, { width: 1080, height: 1080 }), order: 2 },
      { ...createCarouselCard(0, { width: 1080, height: 1080 }), order: 0 },
      { ...createCarouselCard(1, { width: 1080, height: 1080 }), order: 1 },
    ];
    render(<CarouselCardList {...defaultProps} cards={cards} />);

    const cardNumbers = screen.getAllByText(/^[123]$/);
    expect(cardNumbers.map((el) => el.textContent)).toEqual(['1', '2', '3']);
  });
});
