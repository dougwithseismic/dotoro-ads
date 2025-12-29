/**
 * Carousel Editor Components
 *
 * Components for creating and editing multi-card carousel ads
 * in both data-driven and manual modes.
 */

// Components
export { CarouselModeToggle, type CarouselModeToggleProps } from './CarouselModeToggle';
export { CarouselCardList, type CarouselCardListProps } from './CarouselCardList';
export { CardNavigator, type CardNavigatorProps } from './CardNavigator';
export { CardReorder, type CardReorderProps } from './CardReorder';
export { DataRowSelector, type DataRowSelectorProps, type DataRow } from './DataRowSelector';
export { CarouselCardEditor, type CarouselCardEditorProps, type CardMetadata } from './CarouselCardEditor';
export { CarouselPreview, type CarouselPreviewProps } from './CarouselPreview';

// Hooks
export {
  useCarouselEditor,
  type UseCarouselEditorOptions,
  type UseCarouselEditorReturn,
} from './hooks/useCarouselEditor';
export {
  useCarouselValidation,
  useDataRowValidation,
  type UseCarouselValidationReturn,
  type UseDataRowValidationReturn,
} from './hooks/useCarouselValidation';
