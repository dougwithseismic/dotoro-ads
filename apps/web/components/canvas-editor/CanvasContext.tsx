'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
  type Dispatch,
} from 'react';
import type * as fabric from 'fabric';
import type {
  CanvasState,
  CanvasAction,
  EditorTool,
  TemplateVariable,
} from './types';
import { DEFAULT_CANVAS_SETTINGS, ASPECT_RATIOS } from './types';

/**
 * Initial canvas state
 */
const initialState: CanvasState = {
  selectedObjects: [],
  zoom: 1,
  canvasSize: {
    width: DEFAULT_CANVAS_SETTINGS.WIDTH,
    height: DEFAULT_CANVAS_SETTINGS.HEIGHT,
  },
  aspectRatio: '1:1',
  isDirty: false,
  variables: [],
  activeTool: 'select',
  isLoading: false,
  error: null,
};

/**
 * Canvas state reducer
 */
function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'SELECT_OBJECTS':
      return {
        ...state,
        selectedObjects: action.payload,
      };

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedObjects: [],
      };

    case 'SET_ZOOM':
      return {
        ...state,
        zoom: Math.max(0.1, Math.min(5, action.payload)),
      };

    case 'SET_CANVAS_SIZE':
      return {
        ...state,
        canvasSize: action.payload,
      };

    case 'SET_ASPECT_RATIO':
      const preset = ASPECT_RATIOS[action.payload as keyof typeof ASPECT_RATIOS];
      return {
        ...state,
        aspectRatio: action.payload,
        canvasSize: preset
          ? { width: preset.width, height: preset.height }
          : state.canvasSize,
      };

    case 'MARK_DIRTY':
      return {
        ...state,
        isDirty: true,
      };

    case 'MARK_CLEAN':
      return {
        ...state,
        isDirty: false,
      };

    case 'UPDATE_VARIABLES':
      return {
        ...state,
        variables: action.payload,
      };

    case 'SET_TOOL':
      return {
        ...state,
        activeTool: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    default:
      return state;
  }
}

/**
 * Canvas state context
 */
const CanvasStateContext = createContext<CanvasState | null>(null);

/**
 * Canvas dispatch context
 */
const CanvasDispatchContext = createContext<Dispatch<CanvasAction> | null>(null);

/**
 * Canvas instance context (for Fabric.js canvas reference)
 */
const CanvasInstanceContext = createContext<{
  canvas: fabric.Canvas | null;
  setCanvas: (canvas: fabric.Canvas | null) => void;
} | null>(null);

/**
 * Canvas Provider Props
 */
interface CanvasProviderProps {
  children: ReactNode;
  initialAspectRatio?: string;
}

/**
 * CanvasProvider - Provides canvas state and actions to children
 */
export function CanvasProvider({
  children,
  initialAspectRatio = '1:1',
}: CanvasProviderProps) {
  const [state, dispatch] = useReducer(canvasReducer, {
    ...initialState,
    aspectRatio: initialAspectRatio,
    canvasSize:
      ASPECT_RATIOS[initialAspectRatio as keyof typeof ASPECT_RATIOS] ??
      initialState.canvasSize,
  });

  // Canvas instance state (managed separately for better performance)
  const [canvasInstance, setCanvasInstance] = useState<fabric.Canvas | null>(null);

  const instanceValue = useMemo(
    () => ({
      canvas: canvasInstance,
      setCanvas: setCanvasInstance,
    }),
    [canvasInstance]
  );

  return (
    <CanvasStateContext.Provider value={state}>
      <CanvasDispatchContext.Provider value={dispatch}>
        <CanvasInstanceContext.Provider value={instanceValue}>
          {children}
        </CanvasInstanceContext.Provider>
      </CanvasDispatchContext.Provider>
    </CanvasStateContext.Provider>
  );
}

/**
 * Hook to access canvas state
 */
export function useCanvasState(): CanvasState {
  const context = useContext(CanvasStateContext);
  if (!context) {
    throw new Error('useCanvasState must be used within a CanvasProvider');
  }
  return context;
}

/**
 * Hook to access canvas dispatch
 */
export function useCanvasDispatch(): Dispatch<CanvasAction> {
  const context = useContext(CanvasDispatchContext);
  if (!context) {
    throw new Error('useCanvasDispatch must be used within a CanvasProvider');
  }
  return context;
}

/**
 * Hook to access canvas instance
 */
export function useCanvasInstance(): {
  canvas: fabric.Canvas | null;
  setCanvas: (canvas: fabric.Canvas | null) => void;
} {
  const context = useContext(CanvasInstanceContext);
  if (!context) {
    throw new Error('useCanvasInstance must be used within a CanvasProvider');
  }
  return context;
}

/**
 * Combined hook for convenience - provides state, dispatch, and common actions
 */
export function useCanvas() {
  const state = useCanvasState();
  const dispatch = useCanvasDispatch();
  const { canvas, setCanvas } = useCanvasInstance();

  // Action creators
  const selectObjects = useCallback(
    (objects: fabric.FabricObject[]) => {
      dispatch({ type: 'SELECT_OBJECTS', payload: objects });
    },
    [dispatch]
  );

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, [dispatch]);

  const setZoom = useCallback(
    (zoom: number) => {
      dispatch({ type: 'SET_ZOOM', payload: zoom });
    },
    [dispatch]
  );

  const setCanvasSize = useCallback(
    (size: { width: number; height: number }) => {
      dispatch({ type: 'SET_CANVAS_SIZE', payload: size });
    },
    [dispatch]
  );

  const setAspectRatio = useCallback(
    (ratio: string) => {
      dispatch({ type: 'SET_ASPECT_RATIO', payload: ratio });
    },
    [dispatch]
  );

  const markDirty = useCallback(() => {
    dispatch({ type: 'MARK_DIRTY' });
  }, [dispatch]);

  const markClean = useCallback(() => {
    dispatch({ type: 'MARK_CLEAN' });
  }, [dispatch]);

  const updateVariables = useCallback(
    (variables: TemplateVariable[]) => {
      dispatch({ type: 'UPDATE_VARIABLES', payload: variables });
    },
    [dispatch]
  );

  const setTool = useCallback(
    (tool: EditorTool) => {
      dispatch({ type: 'SET_TOOL', payload: tool });
    },
    [dispatch]
  );

  const setLoading = useCallback(
    (loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    },
    [dispatch]
  );

  const setError = useCallback(
    (error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    },
    [dispatch]
  );

  return {
    // State
    ...state,
    canvas,

    // Actions
    dispatch,
    setCanvas,
    selectObjects,
    clearSelection,
    setZoom,
    setCanvasSize,
    setAspectRatio,
    markDirty,
    markClean,
    updateVariables,
    setTool,
    setLoading,
    setError,
  };
}

export default CanvasProvider;
