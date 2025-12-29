/**
 * Carousel Validation Functions
 *
 * Validates carousel templates against platform-specific constraints.
 */

import type {
  CarouselTemplate,
  CarouselCard,
  CarouselValidationResult,
  CarouselValidationError,
  CarouselPlatform,
  CarouselPlatformConstraints,
} from "./types.js";
import { CAROUSEL_PLATFORM_CONSTRAINTS, isDataDrivenMode, isManualMode } from "./types.js";

/**
 * Validate a carousel template
 */
export function validateCarousel(
  template: CarouselTemplate
): CarouselValidationResult {
  const errors: CarouselValidationError[] = [];
  const warnings: CarouselValidationError[] = [];
  const constraints = template.platformConstraints;

  // Validate mode-specific requirements
  if (template.mode === "data-driven") {
    if (!template.cardTemplate) {
      errors.push({
        code: "MISSING_CARD_TEMPLATE",
        message: "Card template is required for data-driven mode",
      });
    } else {
      // Validate card template dimensions
      const dimensionErrors = validateCardDimensions(
        template.cardTemplate,
        constraints,
        undefined
      );
      errors.push(...dimensionErrors);
    }
  } else if (template.mode === "manual") {
    if (!template.cards || template.cards.length === 0) {
      errors.push({
        code: "NO_CARDS",
        message: "At least one card is required for manual mode",
      });
    } else {
      // Validate card count
      const countResult = validateCardCount(
        template.cards.length,
        constraints
      );
      errors.push(...countResult.errors);
      warnings.push(...countResult.warnings);

      // Validate each card
      template.cards.forEach((card, index) => {
        const cardErrors = validateCard(card, index, constraints);
        errors.push(...cardErrors);
      });

      // Validate card order
      const orderErrors = validateCardOrder(template.cards);
      errors.push(...orderErrors);
    }
  }

  // Validate aspect ratio consistency
  if (template.aspectRatio !== "1:1") {
    errors.push({
      code: "INVALID_ASPECT_RATIO",
      message: "Carousel cards must use 1:1 aspect ratio",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate card count against platform constraints
 */
export function validateCardCount(
  count: number,
  constraints: CarouselPlatformConstraints
): CarouselValidationResult {
  const errors: CarouselValidationError[] = [];
  const warnings: CarouselValidationError[] = [];

  if (count < constraints.minCards) {
    errors.push({
      code: "TOO_FEW_CARDS",
      message: `Minimum ${constraints.minCards} cards required, got ${count}`,
    });
  }

  if (count > constraints.maxCards) {
    errors.push({
      code: "TOO_MANY_CARDS",
      message: `Maximum ${constraints.maxCards} cards allowed, got ${count}`,
    });
  }

  // Warning if at minimum/maximum
  if (count === constraints.minCards && count > 2) {
    warnings.push({
      code: "AT_MIN_CARDS",
      message: "Carousel is at minimum card count",
    });
  }

  if (count === constraints.maxCards) {
    warnings.push({
      code: "AT_MAX_CARDS",
      message: "Carousel is at maximum card count",
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a single carousel card
 */
export function validateCard(
  card: CarouselCard,
  index: number,
  constraints: CarouselPlatformConstraints
): CarouselValidationError[] {
  const errors: CarouselValidationError[] = [];

  // Validate ID
  if (!card.id || card.id.trim() === "") {
    errors.push({
      code: "MISSING_CARD_ID",
      message: `Card ${index + 1} is missing an ID`,
      cardIndex: index,
    });
  }

  // Validate canvas JSON
  if (!card.canvasJson) {
    errors.push({
      code: "MISSING_CANVAS",
      message: `Card ${index + 1} is missing canvas data`,
      cardIndex: index,
    });
  } else {
    // Validate canvas dimensions
    const dimensionErrors = validateCardDimensions(
      card.canvasJson,
      constraints,
      index
    );
    errors.push(...dimensionErrors);
  }

  // Validate URL if provided
  if (card.url && !isValidUrl(card.url)) {
    errors.push({
      code: "INVALID_URL",
      message: `Card ${index + 1} has an invalid URL`,
      cardIndex: index,
      field: "url",
    });
  }

  // Validate headline length
  if (card.headline && card.headline.length > 100) {
    errors.push({
      code: "HEADLINE_TOO_LONG",
      message: `Card ${index + 1} headline exceeds 100 characters`,
      cardIndex: index,
      field: "headline",
    });
  }

  // Validate description length
  if (card.description && card.description.length > 200) {
    errors.push({
      code: "DESCRIPTION_TOO_LONG",
      message: `Card ${index + 1} description exceeds 200 characters`,
      cardIndex: index,
      field: "description",
    });
  }

  return errors;
}

/**
 * Validate card canvas dimensions
 */
export function validateCardDimensions(
  canvasJson: { width?: number; height?: number },
  constraints: CarouselPlatformConstraints,
  cardIndex: number | undefined
): CarouselValidationError[] {
  const errors: CarouselValidationError[] = [];
  const { width, height } = constraints.dimensions;
  const cardLabel = cardIndex !== undefined ? `Card ${cardIndex + 1}` : "Card template";

  if (canvasJson.width !== width) {
    errors.push({
      code: "INVALID_WIDTH",
      message: `${cardLabel} width must be ${width}px, got ${canvasJson.width}px`,
      cardIndex,
      field: "width",
    });
  }

  if (canvasJson.height !== height) {
    errors.push({
      code: "INVALID_HEIGHT",
      message: `${cardLabel} height must be ${height}px, got ${canvasJson.height}px`,
      cardIndex,
      field: "height",
    });
  }

  return errors;
}

/**
 * Validate card order is continuous and zero-based
 */
export function validateCardOrder(cards: CarouselCard[]): CarouselValidationError[] {
  const errors: CarouselValidationError[] = [];
  const sortedCards = [...cards].sort((a, b) => a.order - b.order);

  for (let i = 0; i < sortedCards.length; i++) {
    const card = sortedCards[i];
    if (card && card.order !== i) {
      errors.push({
        code: "INVALID_ORDER",
        message: `Card order is not continuous. Expected order ${i}, got ${card.order}`,
        cardIndex: i,
        field: "order",
      });
      break; // Only report first order error
    }
  }

  return errors;
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  // Allow variables in URLs
  if (url.includes("{") && url.includes("}")) {
    return true;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get platform constraints for validation
 */
export function getCarouselConstraints(
  platform: CarouselPlatform
): CarouselPlatformConstraints {
  return CAROUSEL_PLATFORM_CONSTRAINTS[platform];
}

/**
 * Check if more cards can be added
 */
export function canAddCard(
  currentCount: number,
  platform: CarouselPlatform
): boolean {
  const constraints = CAROUSEL_PLATFORM_CONSTRAINTS[platform];
  return currentCount < constraints.maxCards;
}

/**
 * Check if cards can be removed
 */
export function canRemoveCard(
  currentCount: number,
  platform: CarouselPlatform
): boolean {
  const constraints = CAROUSEL_PLATFORM_CONSTRAINTS[platform];
  return currentCount > constraints.minCards;
}

/**
 * Validate selected data rows for data-driven mode
 */
export function validateDataRowSelection(
  selectedCount: number,
  platform: CarouselPlatform
): CarouselValidationResult {
  const constraints = CAROUSEL_PLATFORM_CONSTRAINTS[platform];
  const errors: CarouselValidationError[] = [];
  const warnings: CarouselValidationError[] = [];

  if (selectedCount < constraints.minCards) {
    errors.push({
      code: "TOO_FEW_ROWS",
      message: `Select at least ${constraints.minCards} data rows`,
    });
  }

  if (selectedCount > constraints.maxCards) {
    errors.push({
      code: "TOO_MANY_ROWS",
      message: `Maximum ${constraints.maxCards} data rows allowed`,
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}
