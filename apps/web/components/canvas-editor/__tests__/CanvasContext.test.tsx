import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import {
  CanvasProvider,
  useCanvasState,
  useCanvasDispatch,
  useCanvas,
} from '../CanvasContext';
import { ASPECT_RATIOS } from '../types';

/**
 * Helper wrapper for testing hooks that require CanvasProvider
 */
function createWrapper(initialAspectRatio?: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <CanvasProvider initialAspectRatio={initialAspectRatio}>
        {children}
      </CanvasProvider>
    );
  };
}

describe('CanvasContext', () => {
  describe('useCanvasState', () => {
    it('throws error when used outside CanvasProvider', () => {
      expect(() => {
        renderHook(() => useCanvasState());
      }).toThrow('useCanvasState must be used within a CanvasProvider');
    });

    it('returns initial state with default aspect ratio', () => {
      const { result } = renderHook(() => useCanvasState(), {
        wrapper: createWrapper(),
      });

      expect(result.current.aspectRatio).toBe('1:1');
      expect(result.current.canvasSize.width).toBe(1080);
      expect(result.current.canvasSize.height).toBe(1080);
      expect(result.current.zoom).toBe(1);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.activeTool).toBe('select');
      expect(result.current.selectedObjects).toEqual([]);
      expect(result.current.variables).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('initializes with custom aspect ratio', () => {
      const { result } = renderHook(() => useCanvasState(), {
        wrapper: createWrapper('16:9'),
      });

      expect(result.current.aspectRatio).toBe('16:9');
      expect(result.current.canvasSize.width).toBe(ASPECT_RATIOS['16:9'].width);
      expect(result.current.canvasSize.height).toBe(ASPECT_RATIOS['16:9'].height);
    });
  });

  describe('useCanvasDispatch', () => {
    it('throws error when used outside CanvasProvider', () => {
      expect(() => {
        renderHook(() => useCanvasDispatch());
      }).toThrow('useCanvasDispatch must be used within a CanvasProvider');
    });

    it('returns dispatch function', () => {
      const { result } = renderHook(() => useCanvasDispatch(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current).toBe('function');
    });
  });

  describe('reducer actions', () => {
    describe('SET_ZOOM', () => {
      it('updates zoom level', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.setZoom(1.5);
        });

        expect(result.current.zoom).toBe(1.5);
      });

      it('clamps zoom to minimum of 0.1', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.setZoom(0.05);
        });

        expect(result.current.zoom).toBe(0.1);
      });

      it('clamps zoom to maximum of 5', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.setZoom(10);
        });

        expect(result.current.zoom).toBe(5);
      });
    });

    describe('SET_TOOL', () => {
      it('changes active tool', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        expect(result.current.activeTool).toBe('select');

        act(() => {
          result.current.setTool('text');
        });

        expect(result.current.activeTool).toBe('text');
      });

      it('supports all tool types', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        const tools = ['select', 'text', 'image', 'rect', 'circle', 'line', 'pan'] as const;

        for (const tool of tools) {
          act(() => {
            result.current.setTool(tool);
          });

          expect(result.current.activeTool).toBe(tool);
        }
      });
    });

    describe('MARK_DIRTY / MARK_CLEAN', () => {
      it('marks canvas as dirty', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        expect(result.current.isDirty).toBe(false);

        act(() => {
          result.current.markDirty();
        });

        expect(result.current.isDirty).toBe(true);
      });

      it('marks canvas as clean', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.markDirty();
        });

        expect(result.current.isDirty).toBe(true);

        act(() => {
          result.current.markClean();
        });

        expect(result.current.isDirty).toBe(false);
      });
    });

    describe('SET_ASPECT_RATIO', () => {
      it('changes aspect ratio and updates canvas size', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper('1:1'),
        });

        expect(result.current.aspectRatio).toBe('1:1');
        expect(result.current.canvasSize.width).toBe(1080);
        expect(result.current.canvasSize.height).toBe(1080);

        act(() => {
          result.current.setAspectRatio('16:9');
        });

        expect(result.current.aspectRatio).toBe('16:9');
        expect(result.current.canvasSize.width).toBe(ASPECT_RATIOS['16:9'].width);
        expect(result.current.canvasSize.height).toBe(ASPECT_RATIOS['16:9'].height);
      });

      it('handles portrait aspect ratio', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.setAspectRatio('9:16');
        });

        expect(result.current.aspectRatio).toBe('9:16');
        expect(result.current.canvasSize).toEqual({
          width: ASPECT_RATIOS['9:16'].width,
          height: ASPECT_RATIOS['9:16'].height,
        });
      });

      it('keeps current size for unknown aspect ratio', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper('1:1'),
        });

        const originalSize = { ...result.current.canvasSize };

        act(() => {
          result.current.setAspectRatio('custom');
        });

        expect(result.current.aspectRatio).toBe('custom');
        expect(result.current.canvasSize).toEqual(originalSize);
      });
    });

    describe('SET_CANVAS_SIZE', () => {
      it('updates canvas size directly', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.setCanvasSize({ width: 500, height: 300 });
        });

        expect(result.current.canvasSize).toEqual({ width: 500, height: 300 });
      });
    });

    describe('UPDATE_VARIABLES', () => {
      it('updates template variables', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        const variables = [
          { name: 'headline', type: 'text' as const, defaultValue: 'Hello' },
          { name: 'image', type: 'image' as const, sourceColumn: 'image_url' },
        ];

        act(() => {
          result.current.updateVariables(variables);
        });

        expect(result.current.variables).toEqual(variables);
      });

      it('replaces existing variables', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.updateVariables([
            { name: 'old', type: 'text' as const },
          ]);
        });

        act(() => {
          result.current.updateVariables([
            { name: 'new', type: 'text' as const },
          ]);
        });

        expect(result.current.variables).toEqual([
          { name: 'new', type: 'text' as const },
        ]);
      });
    });

    describe('SELECT_OBJECTS / CLEAR_SELECTION', () => {
      it('updates selected objects', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        // Mock fabric objects
        const mockObjects = [
          { type: 'rect', id: '1' },
          { type: 'text', id: '2' },
        ] as unknown as any[];

        act(() => {
          result.current.selectObjects(mockObjects);
        });

        expect(result.current.selectedObjects).toEqual(mockObjects);
      });

      it('clears selection', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        const mockObjects = [{ type: 'rect', id: '1' }] as unknown as any[];

        act(() => {
          result.current.selectObjects(mockObjects);
        });

        expect(result.current.selectedObjects.length).toBe(1);

        act(() => {
          result.current.clearSelection();
        });

        expect(result.current.selectedObjects).toEqual([]);
      });
    });

    describe('SET_LOADING', () => {
      it('updates loading state', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        expect(result.current.isLoading).toBe(false);

        act(() => {
          result.current.setLoading(true);
        });

        expect(result.current.isLoading).toBe(true);

        act(() => {
          result.current.setLoading(false);
        });

        expect(result.current.isLoading).toBe(false);
      });
    });

    describe('SET_ERROR', () => {
      it('sets error message', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        expect(result.current.error).toBeNull();

        act(() => {
          result.current.setError('Something went wrong');
        });

        expect(result.current.error).toBe('Something went wrong');
      });

      it('clears loading state when error is set', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.setLoading(true);
        });

        expect(result.current.isLoading).toBe(true);

        act(() => {
          result.current.setError('Error occurred');
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe('Error occurred');
      });

      it('clears error by setting null', () => {
        const { result } = renderHook(() => useCanvas(), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.setError('Error');
        });

        expect(result.current.error).toBe('Error');

        act(() => {
          result.current.setError(null);
        });

        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('useCanvas combined hook', () => {
    it('provides all state and action methods', () => {
      const { result } = renderHook(() => useCanvas(), {
        wrapper: createWrapper(),
      });

      // State properties
      expect(result.current).toHaveProperty('selectedObjects');
      expect(result.current).toHaveProperty('zoom');
      expect(result.current).toHaveProperty('canvasSize');
      expect(result.current).toHaveProperty('aspectRatio');
      expect(result.current).toHaveProperty('isDirty');
      expect(result.current).toHaveProperty('variables');
      expect(result.current).toHaveProperty('activeTool');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('canvas');

      // Action methods
      expect(typeof result.current.dispatch).toBe('function');
      expect(typeof result.current.setCanvas).toBe('function');
      expect(typeof result.current.selectObjects).toBe('function');
      expect(typeof result.current.clearSelection).toBe('function');
      expect(typeof result.current.setZoom).toBe('function');
      expect(typeof result.current.setCanvasSize).toBe('function');
      expect(typeof result.current.setAspectRatio).toBe('function');
      expect(typeof result.current.markDirty).toBe('function');
      expect(typeof result.current.markClean).toBe('function');
      expect(typeof result.current.updateVariables).toBe('function');
      expect(typeof result.current.setTool).toBe('function');
      expect(typeof result.current.setLoading).toBe('function');
      expect(typeof result.current.setError).toBe('function');
    });
  });
});
