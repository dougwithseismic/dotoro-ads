'use client';

import { useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CarouselCard, CarouselPlatformConstraints } from '@repo/core';
import styles from './CardReorder.module.css';

export interface CardReorderProps {
  /** Array of carousel cards */
  cards: CarouselCard[];
  /** Callback when cards are reordered */
  onReorder: (cards: CarouselCard[]) => void;
  /** Currently selected card ID */
  selectedCardId: string | null;
  /** Callback when a card is selected */
  onSelectCard: (cardId: string) => void;
  /** Callback when delete button is clicked on a card */
  onDeleteCard?: (cardId: string) => void;
  /** Platform constraints */
  constraints: CarouselPlatformConstraints;
  /** Card thumbnail renderer (optional) */
  renderThumbnail?: (card: CarouselCard) => React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * CardReorder - Drag-and-drop card reordering component
 *
 * Allows users to reorder carousel cards by dragging with touch-friendly
 * handles. Updates card order property after reorder.
 */
export function CardReorder({
  cards,
  onReorder,
  selectedCardId,
  onSelectCard,
  onDeleteCard,
  constraints,
  renderThumbnail,
  disabled = false,
}: CardReorderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sortedCards = [...cards].sort((a, b) => a.order - b.order);
  const canDelete = cards.length > constraints.minCards;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = sortedCards.findIndex((card) => card.id === active.id);
        const newIndex = sortedCards.findIndex((card) => card.id === over.id);

        const reordered = arrayMove(sortedCards, oldIndex, newIndex);
        // Update order property for each card
        const updatedCards = reordered.map((card, index) => ({
          ...card,
          order: index,
        }));

        onReorder(updatedCards);
      }
    },
    [sortedCards, onReorder]
  );

  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    setActiveId(String(event.active.id));
  }, []);

  if (disabled) {
    return (
      <div className={`${styles.container} ${styles.disabled}`}>
        {sortedCards.map((card, index) => (
          <StaticCard
            key={card.id}
            card={card}
            index={index}
            isSelected={selectedCardId === card.id}
            renderThumbnail={renderThumbnail}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedCards.map((c) => c.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div className={styles.container} role="list" aria-label="Reorderable cards">
          {sortedCards.map((card, index) => (
            <SortableCard
              key={card.id}
              card={card}
              index={index}
              isSelected={selectedCardId === card.id}
              isDragging={activeId === card.id}
              onSelect={onSelectCard}
              onDelete={canDelete && onDeleteCard ? () => onDeleteCard(card.id) : undefined}
              renderThumbnail={renderThumbnail}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface SortableCardProps {
  card: CarouselCard;
  index: number;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: (id: string) => void;
  onDelete?: () => void;
  renderThumbnail?: (card: CarouselCard) => React.ReactNode;
}

function SortableCard({
  card,
  index,
  isSelected,
  isDragging,
  onSelect,
  onDelete,
  renderThumbnail,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isSelected ? styles.selected : ''} ${isDragging ? styles.dragging : ''}`}
      role="listitem"
      aria-selected={isSelected}
    >
      <button
        type="button"
        className={styles.dragHandle}
        aria-label={`Drag card ${index + 1}`}
        {...attributes}
        {...listeners}
      >
        <DragIcon />
      </button>

      <button
        type="button"
        className={styles.cardContent}
        onClick={() => onSelect(card.id)}
        aria-label={`Select card ${index + 1}`}
      >
        <div className={styles.thumbnail}>
          {renderThumbnail ? renderThumbnail(card) : <DefaultThumbnail />}
        </div>
        <span className={styles.cardNumber}>{index + 1}</span>
      </button>

      {onDelete && (
        <button
          type="button"
          className={styles.deleteButton}
          onClick={onDelete}
          aria-label={`Delete card ${index + 1}`}
        >
          <DeleteIcon />
        </button>
      )}
    </div>
  );
}

interface StaticCardProps {
  card: CarouselCard;
  index: number;
  isSelected: boolean;
  renderThumbnail?: (card: CarouselCard) => React.ReactNode;
}

function StaticCard({
  card,
  index,
  isSelected,
  renderThumbnail,
}: StaticCardProps) {
  return (
    <div
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      role="listitem"
    >
      <div className={styles.cardContent}>
        <div className={styles.thumbnail}>
          {renderThumbnail ? renderThumbnail(card) : <DefaultThumbnail />}
        </div>
        <span className={styles.cardNumber}>{index + 1}</span>
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
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 16l5-5 4 4 5-5 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      </svg>
    </div>
  );
}

function DragIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="5" cy="4" r="1.25" fill="currentColor" />
      <circle cx="11" cy="4" r="1.25" fill="currentColor" />
      <circle cx="5" cy="8" r="1.25" fill="currentColor" />
      <circle cx="11" cy="8" r="1.25" fill="currentColor" />
      <circle cx="5" cy="12" r="1.25" fill="currentColor" />
      <circle cx="11" cy="12" r="1.25" fill="currentColor" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 3.5l8 8M11 3.5l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default CardReorder;
