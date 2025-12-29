import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCarouselEditor } from '../hooks/useCarouselEditor';
import { createCarouselTemplate, createEmptyCanvasJson } from '@repo/core';

describe('useCarouselEditor', () => {
  describe('initialization', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() => useCarouselEditor());

      expect(result.current.template.platform).toBe('facebook');
      expect(result.current.template.mode).toBe('manual');
      expect(result.current.cards).toHaveLength(2);
      expect(result.current.isDirty).toBe(false);
    });

    it('initializes with custom platform', () => {
      const { result } = renderHook(() =>
        useCarouselEditor({ platform: 'reddit' })
      );

      expect(result.current.template.platform).toBe('reddit');
      expect(result.current.constraints.maxCards).toBe(6);
    });

    it('initializes with custom mode', () => {
      const { result } = renderHook(() =>
        useCarouselEditor({ mode: 'data-driven' })
      );

      expect(result.current.template.mode).toBe('data-driven');
      expect(result.current.template.cardTemplate).toBeDefined();
    });

    it('initializes with existing template', () => {
      const existingTemplate = createCarouselTemplate('reddit', 'manual');
      const { result } = renderHook(() =>
        useCarouselEditor({ initialTemplate: existingTemplate })
      );

      expect(result.current.template.platform).toBe('reddit');
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('card selection', () => {
    it('selects first card by default', () => {
      const { result } = renderHook(() => useCarouselEditor());

      expect(result.current.selectedCardId).toBe(result.current.cards[0].id);
      expect(result.current.selectedCardIndex).toBe(0);
    });

    it('selects card by ID', () => {
      const { result } = renderHook(() => useCarouselEditor());
      const secondCard = result.current.cards[1];

      act(() => {
        result.current.selectCard(secondCard.id);
      });

      expect(result.current.selectedCardId).toBe(secondCard.id);
      expect(result.current.selectedCardIndex).toBe(1);
    });

    it('selects card by index', () => {
      const { result } = renderHook(() => useCarouselEditor());

      act(() => {
        result.current.selectCardByIndex(1);
      });

      expect(result.current.selectedCardIndex).toBe(1);
      expect(result.current.selectedCard).toBe(result.current.cards[1]);
    });

    it('navigates to previous card', () => {
      const { result } = renderHook(() => useCarouselEditor());

      act(() => {
        result.current.selectCardByIndex(1);
      });

      act(() => {
        result.current.goToPreviousCard();
      });

      expect(result.current.selectedCardIndex).toBe(0);
    });

    it('navigates to next card', () => {
      const { result } = renderHook(() => useCarouselEditor());

      act(() => {
        result.current.goToNextCard();
      });

      expect(result.current.selectedCardIndex).toBe(1);
    });
  });

  describe('card management', () => {
    it('adds a card', () => {
      const { result } = renderHook(() => useCarouselEditor());
      const initialCount = result.current.cardCount;

      act(() => {
        result.current.addCard();
      });

      expect(result.current.cardCount).toBe(initialCount + 1);
      expect(result.current.isDirty).toBe(true);
      // Should select the new card
      expect(result.current.selectedCardIndex).toBe(initialCount);
    });

    it('prevents adding beyond max cards', () => {
      const { result } = renderHook(() =>
        useCarouselEditor({ platform: 'reddit' })
      );

      // Add until max (6 for Reddit)
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.addCard();
        });
      }

      expect(result.current.cardCount).toBe(6);
      expect(result.current.canAddMoreCards).toBe(false);

      // Try to add one more
      act(() => {
        result.current.addCard();
      });

      expect(result.current.cardCount).toBe(6);
    });

    it('deletes a card', () => {
      const { result } = renderHook(() => useCarouselEditor());

      act(() => {
        result.current.addCard(); // Now 3 cards
      });

      const cardToDelete = result.current.cards[1];

      act(() => {
        result.current.deleteCard(cardToDelete.id);
      });

      expect(result.current.cardCount).toBe(2);
      expect(result.current.cards.find((c) => c.id === cardToDelete.id)).toBeUndefined();
    });

    it('prevents deleting below min cards', () => {
      const { result } = renderHook(() => useCarouselEditor());

      expect(result.current.cardCount).toBe(2); // Min for Facebook
      expect(result.current.canRemoveCards).toBe(false);

      act(() => {
        result.current.deleteCard(result.current.cards[0].id);
      });

      expect(result.current.cardCount).toBe(2);
    });

    it('reorders cards', () => {
      const { result } = renderHook(() => useCarouselEditor());

      act(() => {
        result.current.addCard();
      });

      const originalCards = [...result.current.cards];
      const reorderedCards = [
        { ...originalCards[2], order: 0 },
        { ...originalCards[0], order: 1 },
        { ...originalCards[1], order: 2 },
      ];

      act(() => {
        result.current.reorderCards(reorderedCards);
      });

      expect(result.current.cards[0].id).toBe(originalCards[2].id);
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('card updates', () => {
    it('updates card canvas', () => {
      const { result } = renderHook(() => useCarouselEditor());
      const card = result.current.cards[0];
      const newCanvas = createEmptyCanvasJson({ width: 1080, height: 1080 });
      newCanvas.background = '#ff0000';

      act(() => {
        result.current.updateCardCanvas(card.id, newCanvas);
      });

      expect(result.current.cards[0].canvasJson.background).toBe('#ff0000');
      expect(result.current.isDirty).toBe(true);
    });

    it('updates card metadata', () => {
      const { result } = renderHook(() => useCarouselEditor());
      const card = result.current.cards[0];

      act(() => {
        result.current.updateCardMetadata(card.id, {
          headline: 'Test Headline',
          description: 'Test Description',
          url: 'https://example.com',
        });
      });

      expect(result.current.cards[0].headline).toBe('Test Headline');
      expect(result.current.cards[0].description).toBe('Test Description');
      expect(result.current.cards[0].url).toBe('https://example.com');
    });
  });

  describe('mode switching', () => {
    it('switches to data-driven mode', () => {
      const { result } = renderHook(() => useCarouselEditor({ mode: 'manual' }));

      act(() => {
        result.current.setMode('data-driven');
      });

      expect(result.current.template.mode).toBe('data-driven');
      expect(result.current.template.cardTemplate).toBeDefined();
      expect(result.current.isDirty).toBe(true);
    });

    it('switches to manual mode', () => {
      const { result } = renderHook(() =>
        useCarouselEditor({ mode: 'data-driven' })
      );

      act(() => {
        result.current.setMode('manual');
      });

      expect(result.current.template.mode).toBe('manual');
      expect(result.current.cards).toHaveLength(2);
    });
  });

  describe('dirty state', () => {
    it('marks clean', () => {
      const { result } = renderHook(() => useCarouselEditor());

      act(() => {
        result.current.addCard();
      });

      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.markClean();
      });

      expect(result.current.isDirty).toBe(false);
    });
  });
});
