'use client';

import { useCallback, useMemo } from 'react';
import type { CarouselCard, CarouselPlatformConstraints } from '@repo/core';
import styles from './CarouselCardList.module.css';

export interface CarouselCardListProps {
  /** Array of carousel cards */
  cards: CarouselCard[];
  /** Currently selected card ID */
  selectedCardId: string | null;
  /** Callback when a card is selected */
  onSelectCard: (cardId: string) => void;
  /** Callback when add card button is clicked */
  onAddCard: () => void;
  /** Platform constraints for card limits */
  constraints: CarouselPlatformConstraints;
  /** Card thumbnail renderer (optional) */
  renderThumbnail?: (card: CarouselCard) => React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * CarouselCardList - Horizontal thumbnail strip for carousel cards
 *
 * Displays card thumbnails with numbering, selection state, and an add button.
 * Shows card count indicator and respects platform max card limits.
 */
export function CarouselCardList({
  cards,
  selectedCardId,
  onSelectCard,
  onAddCard,
  constraints,
  renderThumbnail,
  disabled = false,
}: CarouselCardListProps) {
  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => a.order - b.order),
    [cards]
  );

  const canAddMore = cards.length < constraints.maxCards;
  const cardCount = cards.length;

  const handleCardClick = useCallback(
    (cardId: string) => {
      if (!disabled) {
        onSelectCard(cardId);
      }
    },
    [onSelectCard, disabled]
  );

  const handleAddClick = useCallback(() => {
    if (!disabled && canAddMore) {
      onAddCard();
    }
  }, [onAddCard, disabled, canAddMore]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, cardId: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCardClick(cardId);
      }
    },
    [handleCardClick]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Cards</span>
        <span className={styles.count}>
          {cardCount}/{constraints.maxCards}
        </span>
      </div>

      <div
        className={`${styles.list} ${disabled ? styles.disabled : ''}`}
        role="listbox"
        aria-label="Carousel cards"
        aria-activedescendant={selectedCardId || undefined}
      >
        {sortedCards.map((card, index) => (
          <div
            key={card.id}
            id={card.id}
            role="option"
            aria-selected={selectedCardId === card.id}
            className={`${styles.card} ${selectedCardId === card.id ? styles.selected : ''}`}
            onClick={() => handleCardClick(card.id)}
            onKeyDown={(e) => handleKeyDown(e, card.id)}
            tabIndex={disabled ? -1 : 0}
          >
            <div className={styles.thumbnail}>
              {renderThumbnail ? (
                renderThumbnail(card)
              ) : (
                <DefaultThumbnail />
              )}
            </div>
            <span className={styles.cardNumber}>{index + 1}</span>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            className={styles.addButton}
            onClick={handleAddClick}
            disabled={disabled}
            aria-label="Add new card"
          >
            <AddIcon />
          </button>
        )}
      </div>
    </div>
  );
}

function DefaultThumbnail() {
  return (
    <div className={styles.defaultThumbnail}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M3 16l5-5 4 4 5-5 4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="8.5"
          cy="8.5"
          r="1.5"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

function AddIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 4v12M4 10h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default CarouselCardList;
