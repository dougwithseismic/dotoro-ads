'use client';

import { useCallback, useReducer, useMemo } from 'react';
import type {
  CarouselTemplate,
  CarouselCard,
  CarouselMode,
  CarouselPlatform,
  FabricCanvasJson,
} from '@repo/core';
import {
  createCarouselTemplate,
  createCarouselCard,
  CAROUSEL_PLATFORM_CONSTRAINTS,
  canAddCard,
  canRemoveCard,
} from '@repo/core';

// ============================================================================
// State Types
// ============================================================================

interface CarouselEditorState {
  template: CarouselTemplate;
  selectedCardId: string | null;
  selectedCardIndex: number;
  isDirty: boolean;
}

type CarouselEditorAction =
  | { type: 'SET_MODE'; payload: CarouselMode }
  | { type: 'SET_TEMPLATE'; payload: CarouselTemplate }
  | { type: 'SELECT_CARD'; payload: string }
  | { type: 'SELECT_CARD_INDEX'; payload: number }
  | { type: 'ADD_CARD' }
  | { type: 'DELETE_CARD'; payload: string }
  | { type: 'REORDER_CARDS'; payload: CarouselCard[] }
  | { type: 'UPDATE_CARD_CANVAS'; payload: { cardId: string; canvasJson: FabricCanvasJson } }
  | { type: 'UPDATE_CARD_METADATA'; payload: { cardId: string; headline?: string; description?: string; url?: string } }
  | { type: 'UPDATE_CARD_TEMPLATE'; payload: FabricCanvasJson }
  | { type: 'MARK_CLEAN' };

// ============================================================================
// Reducer
// ============================================================================

function carouselEditorReducer(
  state: CarouselEditorState,
  action: CarouselEditorAction
): CarouselEditorState {
  switch (action.type) {
    case 'SET_MODE': {
      // Create new template with the new mode
      const newTemplate = createCarouselTemplate(state.template.platform, action.payload);
      const firstCard = action.payload === 'manual' && newTemplate.cards?.[0];
      return {
        ...state,
        template: newTemplate,
        selectedCardId: firstCard ? firstCard.id : null,
        selectedCardIndex: 0,
        isDirty: true,
      };
    }

    case 'SET_TEMPLATE': {
      const cards = action.payload.cards ?? [];
      const sortedCards = [...cards].sort((a, b) => a.order - b.order);
      const firstCard = sortedCards[0];
      return {
        ...state,
        template: action.payload,
        selectedCardId: firstCard?.id ?? null,
        selectedCardIndex: 0,
        isDirty: false,
      };
    }

    case 'SELECT_CARD': {
      const cards = state.template.cards ?? [];
      const sortedCards = [...cards].sort((a, b) => a.order - b.order);
      const index = sortedCards.findIndex((c) => c.id === action.payload);
      return {
        ...state,
        selectedCardId: action.payload,
        selectedCardIndex: index >= 0 ? index : 0,
      };
    }

    case 'SELECT_CARD_INDEX': {
      const cards = state.template.cards ?? [];
      const sortedCards = [...cards].sort((a, b) => a.order - b.order);
      const card = sortedCards[action.payload];
      return {
        ...state,
        selectedCardId: card?.id ?? null,
        selectedCardIndex: action.payload,
      };
    }

    case 'ADD_CARD': {
      if (state.template.mode !== 'manual') return state;
      const cards = state.template.cards ?? [];
      if (!canAddCard(cards.length, state.template.platform)) return state;

      const newCard = createCarouselCard(
        cards.length,
        state.template.platformConstraints.dimensions
      );
      const updatedCards = [...cards, newCard];

      return {
        ...state,
        template: {
          ...state.template,
          cards: updatedCards,
          cardCount: updatedCards.length,
        },
        selectedCardId: newCard.id,
        selectedCardIndex: updatedCards.length - 1,
        isDirty: true,
      };
    }

    case 'DELETE_CARD': {
      if (state.template.mode !== 'manual') return state;
      const cards = state.template.cards ?? [];
      if (!canRemoveCard(cards.length, state.template.platform)) return state;

      const filteredCards = cards.filter((c) => c.id !== action.payload);
      // Re-index the order
      const reindexedCards = filteredCards
        .sort((a, b) => a.order - b.order)
        .map((card, index) => ({ ...card, order: index }));

      // Select the previous card or first card
      const deletedIndex = cards.findIndex((c) => c.id === action.payload);
      const newIndex = Math.min(deletedIndex, reindexedCards.length - 1);
      const newSelectedCard = reindexedCards[newIndex];

      return {
        ...state,
        template: {
          ...state.template,
          cards: reindexedCards,
          cardCount: reindexedCards.length,
        },
        selectedCardId: newSelectedCard?.id ?? null,
        selectedCardIndex: newIndex >= 0 ? newIndex : 0,
        isDirty: true,
      };
    }

    case 'REORDER_CARDS': {
      if (state.template.mode !== 'manual') return state;
      return {
        ...state,
        template: {
          ...state.template,
          cards: action.payload,
        },
        isDirty: true,
      };
    }

    case 'UPDATE_CARD_CANVAS': {
      if (state.template.mode !== 'manual' || !state.template.cards) return state;

      const updatedCards = state.template.cards.map((card) =>
        card.id === action.payload.cardId
          ? { ...card, canvasJson: action.payload.canvasJson }
          : card
      );

      return {
        ...state,
        template: {
          ...state.template,
          cards: updatedCards,
        },
        isDirty: true,
      };
    }

    case 'UPDATE_CARD_METADATA': {
      if (state.template.mode !== 'manual' || !state.template.cards) return state;

      const updatedCards = state.template.cards.map((card) =>
        card.id === action.payload.cardId
          ? {
              ...card,
              headline: action.payload.headline ?? card.headline,
              description: action.payload.description ?? card.description,
              url: action.payload.url ?? card.url,
            }
          : card
      );

      return {
        ...state,
        template: {
          ...state.template,
          cards: updatedCards,
        },
        isDirty: true,
      };
    }

    case 'UPDATE_CARD_TEMPLATE': {
      if (state.template.mode !== 'data-driven') return state;

      return {
        ...state,
        template: {
          ...state.template,
          cardTemplate: action.payload,
        },
        isDirty: true,
      };
    }

    case 'MARK_CLEAN':
      return {
        ...state,
        isDirty: false,
      };

    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

export interface UseCarouselEditorOptions {
  /** Initial platform */
  platform?: CarouselPlatform;
  /** Initial mode */
  mode?: CarouselMode;
  /** Initial template (overrides platform/mode) */
  initialTemplate?: CarouselTemplate;
}

export interface UseCarouselEditorReturn {
  // State
  template: CarouselTemplate;
  cards: CarouselCard[];
  selectedCard: CarouselCard | null;
  selectedCardId: string | null;
  selectedCardIndex: number;
  isDirty: boolean;
  constraints: typeof CAROUSEL_PLATFORM_CONSTRAINTS[CarouselPlatform];

  // Card count helpers
  cardCount: number;
  canAddMoreCards: boolean;
  canRemoveCards: boolean;

  // Actions
  setMode: (mode: CarouselMode) => void;
  setTemplate: (template: CarouselTemplate) => void;
  selectCard: (cardId: string) => void;
  selectCardByIndex: (index: number) => void;
  goToPreviousCard: () => void;
  goToNextCard: () => void;
  addCard: () => void;
  deleteCard: (cardId: string) => void;
  reorderCards: (cards: CarouselCard[]) => void;
  updateCardCanvas: (cardId: string, canvasJson: FabricCanvasJson) => void;
  updateCardMetadata: (cardId: string, metadata: { headline?: string; description?: string; url?: string }) => void;
  updateCardTemplate: (canvasJson: FabricCanvasJson) => void;
  markClean: () => void;
}

/**
 * useCarouselEditor - Main hook for carousel editor state management
 *
 * Provides state and actions for managing carousel template editing,
 * including card selection, reordering, and canvas updates.
 */
export function useCarouselEditor({
  platform = 'facebook',
  mode = 'manual',
  initialTemplate,
}: UseCarouselEditorOptions = {}): UseCarouselEditorReturn {
  const initialState: CarouselEditorState = useMemo(() => {
    const template = initialTemplate ?? createCarouselTemplate(platform, mode);
    const cards = template.cards ?? [];
    const sortedCards = [...cards].sort((a, b) => a.order - b.order);
    const firstCard = sortedCards[0];

    return {
      template,
      selectedCardId: firstCard?.id ?? null,
      selectedCardIndex: 0,
      isDirty: false,
    };
  }, [initialTemplate, platform, mode]);

  const [state, dispatch] = useReducer(carouselEditorReducer, initialState);

  // Derived state
  const sortedCards = useMemo(
    () => [...(state.template.cards ?? [])].sort((a, b) => a.order - b.order),
    [state.template.cards]
  );

  const selectedCard = useMemo(
    () => sortedCards.find((c) => c.id === state.selectedCardId) ?? null,
    [sortedCards, state.selectedCardId]
  );

  const constraints = CAROUSEL_PLATFORM_CONSTRAINTS[state.template.platform];
  const cardCount = sortedCards.length;
  const canAddMoreCards = canAddCard(cardCount, state.template.platform);
  const canRemoveCards = canRemoveCard(cardCount, state.template.platform);

  // Actions
  const setMode = useCallback((newMode: CarouselMode) => {
    dispatch({ type: 'SET_MODE', payload: newMode });
  }, []);

  const setTemplate = useCallback((template: CarouselTemplate) => {
    dispatch({ type: 'SET_TEMPLATE', payload: template });
  }, []);

  const selectCard = useCallback((cardId: string) => {
    dispatch({ type: 'SELECT_CARD', payload: cardId });
  }, []);

  const selectCardByIndex = useCallback((index: number) => {
    dispatch({ type: 'SELECT_CARD_INDEX', payload: index });
  }, []);

  const goToPreviousCard = useCallback(() => {
    if (state.selectedCardIndex > 0) {
      dispatch({ type: 'SELECT_CARD_INDEX', payload: state.selectedCardIndex - 1 });
    }
  }, [state.selectedCardIndex]);

  const goToNextCard = useCallback(() => {
    if (state.selectedCardIndex < sortedCards.length - 1) {
      dispatch({ type: 'SELECT_CARD_INDEX', payload: state.selectedCardIndex + 1 });
    }
  }, [state.selectedCardIndex, sortedCards.length]);

  const addCard = useCallback(() => {
    dispatch({ type: 'ADD_CARD' });
  }, []);

  const deleteCard = useCallback((cardId: string) => {
    dispatch({ type: 'DELETE_CARD', payload: cardId });
  }, []);

  const reorderCards = useCallback((cards: CarouselCard[]) => {
    dispatch({ type: 'REORDER_CARDS', payload: cards });
  }, []);

  const updateCardCanvas = useCallback((cardId: string, canvasJson: FabricCanvasJson) => {
    dispatch({ type: 'UPDATE_CARD_CANVAS', payload: { cardId, canvasJson } });
  }, []);

  const updateCardMetadata = useCallback(
    (cardId: string, metadata: { headline?: string; description?: string; url?: string }) => {
      dispatch({ type: 'UPDATE_CARD_METADATA', payload: { cardId, ...metadata } });
    },
    []
  );

  const updateCardTemplate = useCallback((canvasJson: FabricCanvasJson) => {
    dispatch({ type: 'UPDATE_CARD_TEMPLATE', payload: canvasJson });
  }, []);

  const markClean = useCallback(() => {
    dispatch({ type: 'MARK_CLEAN' });
  }, []);

  return {
    // State
    template: state.template,
    cards: sortedCards,
    selectedCard,
    selectedCardId: state.selectedCardId,
    selectedCardIndex: state.selectedCardIndex,
    isDirty: state.isDirty,
    constraints,

    // Helpers
    cardCount,
    canAddMoreCards,
    canRemoveCards,

    // Actions
    setMode,
    setTemplate,
    selectCard,
    selectCardByIndex,
    goToPreviousCard,
    goToNextCard,
    addCard,
    deleteCard,
    reorderCards,
    updateCardCanvas,
    updateCardMetadata,
    updateCardTemplate,
    markClean,
  };
}

export default useCarouselEditor;
