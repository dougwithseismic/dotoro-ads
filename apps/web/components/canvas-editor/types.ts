/**
 * Canvas Editor Types
 *
 * Type definitions for the Fabric.js canvas editor components
 */

import type { Canvas, FabricObject, IText, Image as FabricImage, Rect, Circle, Line } from "fabric";

// ============================================================================
// Fabric.js Canvas JSON Types
// ============================================================================

/**
 * Serialized Fabric.js canvas state
 */
export interface FabricCanvasJSON {
  version: string;
  objects: FabricObjectJSON[];
  background?: string;
  backgroundImage?: FabricObjectJSON;
  width?: number;
  height?: number;
}

/**
 * Serialized Fabric.js object
 */
export interface FabricObjectJSON {
  type: string;
  version?: string;
  originX?: string;
  originY?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  opacity?: number;
  fill?: string | null;
  stroke?: string | null;
  strokeWidth?: number;
  visible?: boolean;
  selectable?: boolean;
  locked?: boolean;
  name?: string;
  variableBinding?: string;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: string;
  src?: string;
  [key: string]: unknown;
}

// ============================================================================
// Template Variable Types
// ============================================================================

/**
 * Template variable extracted from canvas objects
 */
export interface TemplateVariable {
  name: string;
  type: "text" | "image";
  defaultValue?: string;
  sourceColumn?: string;
}

// ============================================================================
// Safe Zone Types
// ============================================================================

/**
 * Safe zone for aspect ratio variants (percentages from edges)
 */
export interface SafeZone {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// ============================================================================
// Canvas State Types
// ============================================================================

/**
 * Current tool selected in the editor
 */
export type EditorTool = "select" | "text" | "image" | "rect" | "circle" | "line" | "pan";

/**
 * Canvas editor state
 */
export interface CanvasState {
  /** Currently selected object(s) */
  selectedObjects: FabricObject[];
  /** Current zoom level (1 = 100%) */
  zoom: number;
  /** Canvas dimensions */
  canvasSize: { width: number; height: number };
  /** Current aspect ratio (e.g., "1:1", "16:9") */
  aspectRatio: AspectRatioKey;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Extracted template variables */
  variables: TemplateVariable[];
  /** Currently selected tool */
  activeTool: EditorTool;
  /** Whether canvas is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Canvas actions for state management
 */
export type CanvasAction =
  | { type: "SELECT_OBJECTS"; payload: FabricObject[] }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_ZOOM"; payload: number }
  | { type: "SET_CANVAS_SIZE"; payload: { width: number; height: number } }
  | { type: "SET_ASPECT_RATIO"; payload: AspectRatioKey }
  | { type: "MARK_DIRTY" }
  | { type: "MARK_CLEAN" }
  | { type: "UPDATE_VARIABLES"; payload: TemplateVariable[] }
  | { type: "SET_TOOL"; payload: EditorTool }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

// ============================================================================
// History Types
// ============================================================================

/**
 * History state for undo/redo
 */
export interface HistoryState {
  canvasJson: string;
  timestamp: number;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * FabricCanvas component props
 */
export interface FabricCanvasProps {
  /** Initial canvas JSON to load */
  initialJson?: FabricCanvasJSON;
  /** Canvas width in pixels */
  width?: number;
  /** Canvas height in pixels */
  height?: number;
  /** Callback when canvas changes */
  onChange?: (json: FabricCanvasJSON) => void;
  /** Callback when selection changes */
  onSelectionChange?: (objects: FabricObject[]) => void;
  /** Whether the canvas is read-only */
  readOnly?: boolean;
  /** CSS class name */
  className?: string;
}

/**
 * Canvas context value
 */
export interface CanvasContextValue {
  /** Fabric.js canvas instance */
  canvas: Canvas | null;
  /** Current canvas state */
  state: CanvasState;
  /** Dispatch state action */
  dispatch: React.Dispatch<CanvasAction>;
  /** Add text object to canvas */
  addText: (options?: Partial<IText>) => IText | null;
  /** Add image to canvas from URL */
  addImage: (url: string, options?: Partial<FabricImage>) => Promise<FabricImage | null>;
  /** Add rectangle to canvas */
  addRect: (options?: Partial<Rect>) => Rect | null;
  /** Add circle to canvas */
  addCircle: (options?: Partial<Circle>) => Circle | null;
  /** Add line to canvas */
  addLine: (options?: Partial<Line>) => Line | null;
  /** Delete selected objects */
  deleteSelected: () => void;
  /** Bring selected objects to front */
  bringToFront: () => void;
  /** Send selected objects to back */
  sendToBack: () => void;
  /** Get current canvas JSON */
  getCanvasJson: () => FabricCanvasJSON | null;
  /** Load canvas from JSON */
  loadFromJson: (json: FabricCanvasJSON) => Promise<void>;
  /** Set zoom level */
  setZoom: (zoom: number) => void;
  /** Fit canvas to container */
  fitToContainer: () => void;
  /** Undo last action */
  undo: () => void;
  /** Redo last undone action */
  redo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
}

// ============================================================================
// Aspect Ratio Types
// ============================================================================

/**
 * Predefined aspect ratios
 */
export const ASPECT_RATIOS = {
  "1:1": { width: 1080, height: 1080, label: "Square" },
  "16:9": { width: 1920, height: 1080, label: "Landscape" },
  "9:16": { width: 1080, height: 1920, label: "Portrait/Story" },
  "4:3": { width: 1440, height: 1080, label: "Standard" },
  "4:5": { width: 1080, height: 1350, label: "Instagram Portrait" },
} as const;

export type AspectRatioKey = keyof typeof ASPECT_RATIOS;

/**
 * Alias for EditorTool (for API consistency)
 */
export type CanvasTool = EditorTool;

/**
 * Zoom constraints
 */
export const ZOOM_CONSTRAINTS = {
  MIN: 0.1,
  MAX: 5,
  STEP: 0.1,
} as const;

/**
 * Default canvas settings
 */
export const DEFAULT_CANVAS_SETTINGS = {
  WIDTH: 800,
  HEIGHT: 600,
  BACKGROUND: '#ffffff',
  SELECTION_COLOR: 'rgba(100, 100, 255, 0.3)',
  SELECTION_BORDER_COLOR: '#4444ff',
  SELECTION_LINE_WIDTH: 1,
} as const;

/**
 * History configuration
 */
export const HISTORY_CONFIG = {
  MAX_STATES: 50,
  DEBOUNCE_MS: 300,
} as const;

/**
 * Parse aspect ratio string to dimensions
 */
export function parseAspectRatio(ratio: string): { widthRatio: number; heightRatio: number } {
  const [w, h] = ratio.split(":").map(Number);
  return { widthRatio: w || 1, heightRatio: h || 1 };
}

/**
 * Calculate dimensions for a given aspect ratio and max size
 */
export function calculateDimensions(
  aspectRatio: string,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const { widthRatio, heightRatio } = parseAspectRatio(aspectRatio);
  const targetRatio = widthRatio / heightRatio;
  const containerRatio = maxWidth / maxHeight;

  if (targetRatio > containerRatio) {
    // Width-constrained
    return { width: maxWidth, height: maxWidth / targetRatio };
  } else {
    // Height-constrained
    return { width: maxHeight * targetRatio, height: maxHeight };
  }
}
