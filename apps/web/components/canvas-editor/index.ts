/**
 * Canvas Editor Module
 *
 * Fabric.js-based visual ad editor components for the Dotoro platform.
 *
 * @example
 * ```tsx
 * import {
 *   FabricCanvas,
 *   CanvasProvider,
 *   useFabricCanvas,
 *   useCanvasHistory,
 * } from '@/components/canvas-editor';
 *
 * function Editor() {
 *   return (
 *     <CanvasProvider initialAspectRatio="1:1">
 *       <FabricCanvas width={800} height={800} />
 *     </CanvasProvider>
 *   );
 * }
 * ```
 */

// Components
export { FabricCanvas, type FabricCanvasRef } from './FabricCanvas';
export {
  CanvasProvider,
  useCanvasState,
  useCanvasDispatch,
  useCanvasInstance,
  useCanvas,
} from './CanvasContext';
export { EditorToolbar, type EditorToolbarProps } from './EditorToolbar';
export { LayerControls, type LayerControlsProps } from './LayerControls';
export { LayersPanel, type LayersPanelProps } from './LayersPanel';
export { TextFormatting, type TextFormattingProps } from './TextFormatting';
export { PropertiesPanel, type PropertiesPanelProps } from './PropertiesPanel';
export { VariablesPanel, type VariablesPanelProps } from './VariablesPanel';
export { VariableAutocomplete, type VariableAutocompleteProps } from './VariableAutocomplete';

// Hooks
export { useFabricCanvas, type UseFabricCanvasReturn } from './hooks/useFabricCanvas';
export type {
  TextOptions,
  ImageOptions,
  RectOptions,
  CircleOptions,
  LineOptions,
} from './hooks/useFabricCanvas';

export { useCanvasHistory, type UseCanvasHistoryReturn, type UseCanvasHistoryOptions } from './hooks/useCanvasHistory';
export { useVariableDetection, type UseVariableDetectionReturn } from './hooks/useVariableDetection';
export {
  useVariableAutocomplete,
  type UseVariableAutocompleteReturn,
  type AutocompleteSuggestion,
  type AutocompletePosition,
} from './hooks/useVariableAutocomplete';
export {
  usePreviewMode,
  type UsePreviewModeReturn,
  type PreviewData,
} from './hooks/usePreviewMode';

// Types
export type {
  FabricCanvasJSON,
  FabricObjectJSON,
  TemplateVariable,
  SafeZone,
  EditorTool,
  CanvasTool,
  CanvasState,
  CanvasAction,
  HistoryState,
  FabricCanvasProps,
  CanvasContextValue,
  AspectRatioKey,
} from './types';

// Constants
export {
  ASPECT_RATIOS,
  ZOOM_CONSTRAINTS,
  DEFAULT_CANVAS_SETTINGS,
  HISTORY_CONFIG,
} from './types';

// Utilities
export { parseAspectRatio, calculateDimensions } from './types';
