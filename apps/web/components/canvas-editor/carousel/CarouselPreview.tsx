'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CarouselCard, CarouselPlatform } from '@repo/core';
import styles from './CarouselPreview.module.css';

export interface CarouselPreviewProps {
  /** Array of carousel cards */
  cards: CarouselCard[];
  /** Target platform for preview styling */
  platform: CarouselPlatform;
  /** Card thumbnail renderer */
  renderCard: (card: CarouselCard) => React.ReactNode;
  /** Whether to enable touch/swipe navigation */
  enableSwipe?: boolean;
  /** Whether to show navigation dots */
  showDots?: boolean;
  /** Whether to show navigation arrows */
  showArrows?: boolean;
  /** Auto-play interval in ms (0 = disabled) */
  autoPlayInterval?: number;
  /** CSS class name */
  className?: string;
}

/**
 * CarouselPreview - Swipeable carousel preview component
 *
 * Displays carousel cards in a preview format with platform-specific
 * styling, navigation dots, and optional swipe/arrow navigation.
 */
export function CarouselPreview({
  cards,
  platform,
  renderCard,
  enableSwipe = true,
  showDots = true,
  showArrows = true,
  autoPlayInterval = 0,
  className,
}: CarouselPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const sortedCards = [...cards].sort((a, b) => a.order - b.order);
  const totalCards = sortedCards.length;

  const goToCard = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalCards) {
        setCurrentIndex(index);
      }
    },
    [totalCards]
  );

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalCards - 1));
  }, [totalCards]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < totalCards - 1 ? prev + 1 : 0));
  }, [totalCards]);

  // Auto-play
  useEffect(() => {
    if (autoPlayInterval <= 0 || totalCards <= 1) return;

    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlayInterval, totalCards, goToNext]);

  // Touch/swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      touchStartX.current = touch.clientX;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      touchEndX.current = touch.clientX;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!enableSwipe) return;

    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // minimum swipe distance

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  }, [enableSwipe, goToNext, goToPrevious]);

  // Keyboard navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  if (totalCards === 0) {
    return (
      <div className={`${styles.container} ${styles.empty} ${className ?? ''}`}>
        <p className={styles.emptyMessage}>No cards to preview</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${styles[platform]} ${className ?? ''}`}
      role="region"
      aria-label="Carousel preview"
      aria-roledescription="carousel"
      tabIndex={0}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.frame}>
        <div className={styles.header}>
          <PlatformIcon platform={platform} />
          <span className={styles.platformName}>
            {platform === 'facebook' ? 'Facebook' : 'Reddit'} Preview
          </span>
        </div>

        <div className={styles.cardsViewport}>
          <div
            className={styles.cardsTrack}
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
            }}
          >
            {sortedCards.map((card, index) => (
              <div
                key={card.id}
                className={styles.cardSlide}
                role="group"
                aria-roledescription="slide"
                aria-label={`Card ${index + 1} of ${totalCards}`}
                aria-hidden={index !== currentIndex}
              >
                <div className={styles.cardContent}>
                  {renderCard(card)}
                </div>
                {card.headline && (
                  <div className={styles.cardMeta}>
                    <p className={styles.cardHeadline}>{card.headline}</p>
                    {card.description && (
                      <p className={styles.cardDescription}>{card.description}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {showArrows && totalCards > 1 && (
          <>
            <button
              type="button"
              className={`${styles.arrow} ${styles.arrowLeft}`}
              onClick={goToPrevious}
              aria-label="Previous card"
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              className={`${styles.arrow} ${styles.arrowRight}`}
              onClick={goToNext}
              aria-label="Next card"
            >
              <ChevronRightIcon />
            </button>
          </>
        )}

        {showDots && totalCards > 1 && (
          <div className={styles.dots} role="tablist" aria-label="Carousel navigation">
            {sortedCards.map((card, index) => (
              <button
                key={card.id}
                type="button"
                role="tab"
                aria-selected={index === currentIndex}
                aria-label={`Go to card ${index + 1}`}
                className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ''}`}
                onClick={() => goToCard(index)}
              />
            ))}
          </div>
        )}
      </div>

      <div className={styles.indicator}>
        {currentIndex + 1} / {totalCards}
      </div>
    </div>
  );
}

function PlatformIcon({ platform }: { platform: CarouselPlatform }) {
  if (platform === 'facebook') {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="8" fill="#1877F2" />
        <path
          d="M13 10.5H11V16H8.5V10.5H7V8.5H8.5V7.3C8.5 5.5 9.5 4.5 11.2 4.5C11.9 4.5 12.5 4.6 12.5 4.6V6.3H11.8C11 6.3 10.8 6.7 10.8 7.2V8.5H12.4L12.1 10.5H10.8V16"
          fill="white"
        />
      </svg>
    );
  }

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8" fill="#FF4500" />
      <circle cx="7" cy="9" r="1" fill="white" />
      <circle cx="13" cy="9" r="1" fill="white" />
      <path
        d="M7 12C7.5 13 8.5 13.5 10 13.5C11.5 13.5 12.5 13 13 12"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="14" cy="5" r="1" fill="#FF4500" stroke="white" strokeWidth="0.5" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default CarouselPreview;
