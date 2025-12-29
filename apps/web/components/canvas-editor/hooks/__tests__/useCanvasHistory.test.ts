import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCanvasHistory } from '../useCanvasHistory';
import type { FabricCanvasJSON } from '../../types';

/**
 * Mock Fabric.js Canvas
 */
function createMockCanvas() {
  const eventHandlers: Record<string, (() => void)[]> = {};
  let canvasState: FabricCanvasJSON = {
    version: '6.0.0',
    objects: [],
    width: 800,
    height: 600,
  };

  return {
    width: 800,
    height: 600,
    toJSON: vi.fn((propertiesToInclude?: string[]) => ({
      ...canvasState,
    })),
    loadFromJSON: vi.fn((json: FabricCanvasJSON) => {
      canvasState = { ...json };
      return Promise.resolve();
    }),
    renderAll: vi.fn(),
    on: vi.fn((event: string, handler: () => void) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    }),
    off: vi.fn((event: string, handler: () => void) => {
      if (eventHandlers[event]) {
        eventHandlers[event] = eventHandlers[event].filter((h) => h !== handler);
      }
    }),
    // Helper to trigger events in tests
    _triggerEvent: (event: string) => {
      if (eventHandlers[event]) {
        eventHandlers[event].forEach((handler) => handler());
      }
    },
    // Helper to update state
    _setState: (state: FabricCanvasJSON) => {
      canvasState = { ...state };
    },
    // Helper to get state
    _getState: () => canvasState,
  };
}

describe('useCanvasHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('returns initial state with no canvas', () => {
      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: null })
      );

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.historySize).toBe(0);
    });

    it('saves initial state when canvas is provided', () => {
      const mockCanvas = createMockCanvas();

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any })
      );

      // Initial save happens synchronously in useEffect
      // Give the effect time to run
      act(() => {
        vi.runAllTimers();
      });

      expect(result.current.historySize).toBe(1);
      expect(result.current.canUndo).toBe(false); // Only one state, can't undo
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('saveState', () => {
    it('adds state to history', () => {
      const mockCanvas = createMockCanvas();

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      expect(result.current.historySize).toBe(1);

      // Manually save another state
      act(() => {
        result.current.saveState();
      });

      expect(result.current.historySize).toBe(2);
      expect(result.current.canUndo).toBe(true);
    });

    it('respects maxHistory limit', () => {
      const mockCanvas = createMockCanvas();
      const maxHistory = 3;

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any, maxHistory })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      expect(result.current.historySize).toBe(1);

      // Add states up to and beyond the limit
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.saveState();
        });
      }

      expect(result.current.historySize).toBe(maxHistory);
    });

    it('clears redo stack when new state is saved', async () => {
      const mockCanvas = createMockCanvas();

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      // Add more states
      act(() => {
        result.current.saveState();
        result.current.saveState();
      });

      expect(result.current.historySize).toBe(3);

      // Undo to create redo stack
      await act(async () => {
        result.current.undo();
        await vi.runAllTimersAsync();
      });

      expect(result.current.canRedo).toBe(true);

      // Save new state - should clear redo
      act(() => {
        result.current.saveState();
      });

      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('undo', () => {
    it('does nothing when history has only one state', async () => {
      const mockCanvas = createMockCanvas();

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      expect(result.current.historySize).toBe(1);

      await act(async () => {
        result.current.undo();
        await vi.runAllTimersAsync();
      });

      expect(result.current.historySize).toBe(1);
      expect(result.current.canUndo).toBe(false);
    });

    it('restores previous state', async () => {
      const mockCanvas = createMockCanvas();

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      // Add another state
      act(() => {
        result.current.saveState();
      });

      expect(result.current.historySize).toBe(2);
      expect(result.current.canUndo).toBe(true);

      // Undo
      await act(async () => {
        result.current.undo();
        await vi.runAllTimersAsync();
      });

      expect(result.current.historySize).toBe(1);
      expect(mockCanvas.loadFromJSON).toHaveBeenCalled();
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('enables redo after undo', async () => {
      const mockCanvas = createMockCanvas();

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        result.current.saveState();
      });

      expect(result.current.canRedo).toBe(false);

      await act(async () => {
        result.current.undo();
        await vi.runAllTimersAsync();
      });

      expect(result.current.canRedo).toBe(true);
    });
  });

  describe('redo', () => {
    it('does nothing when redo stack is empty', async () => {
      const mockCanvas = createMockCanvas();

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      const initialLoadCalls = mockCanvas.loadFromJSON.mock.calls.length;

      await act(async () => {
        result.current.redo();
        await vi.runAllTimersAsync();
      });

      // loadFromJSON should not be called again
      expect(mockCanvas.loadFromJSON.mock.calls.length).toBe(initialLoadCalls);
    });

    it('restores undone state', async () => {
      const mockCanvas = createMockCanvas();

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      // Add a state
      act(() => {
        result.current.saveState();
      });

      // Undo
      await act(async () => {
        result.current.undo();
        await vi.runAllTimersAsync();
      });

      expect(result.current.canRedo).toBe(true);

      // Redo
      await act(async () => {
        result.current.redo();
        await vi.runAllTimersAsync();
      });

      expect(result.current.canRedo).toBe(false);
      expect(mockCanvas.loadFromJSON).toHaveBeenCalled();
    });

    it('adds state back to history after redo', async () => {
      const mockCanvas = createMockCanvas();

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        result.current.saveState();
      });

      expect(result.current.historySize).toBe(2);

      await act(async () => {
        result.current.undo();
        await vi.runAllTimersAsync();
      });

      expect(result.current.historySize).toBe(1);

      await act(async () => {
        result.current.redo();
        await vi.runAllTimersAsync();
      });

      expect(result.current.historySize).toBe(2);
    });
  });

  describe('clearHistory', () => {
    it('clears all history and starts fresh', () => {
      const mockCanvas = createMockCanvas();

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      // Add multiple states
      act(() => {
        result.current.saveState();
        result.current.saveState();
        result.current.saveState();
      });

      expect(result.current.historySize).toBe(4);

      // Clear history
      act(() => {
        result.current.clearHistory();
      });

      // Should have one state (the new initial)
      expect(result.current.historySize).toBe(1);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('debounced auto-save', () => {
    it('debounces state saves on canvas events', () => {
      const mockCanvas = createMockCanvas();
      const debounceMs = 300;

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any, debounceMs })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      expect(result.current.historySize).toBe(1);

      // Trigger rapid events
      act(() => {
        mockCanvas._triggerEvent('object:modified');
        mockCanvas._triggerEvent('object:modified');
        mockCanvas._triggerEvent('object:modified');
      });

      // Before debounce completes, history should still be 1
      expect(result.current.historySize).toBe(1);

      // Advance timers past debounce
      act(() => {
        vi.advanceTimersByTime(debounceMs + 50);
      });

      // Should have only one additional state (debounced)
      expect(result.current.historySize).toBe(2);
    });

    it('saves on object:added event', () => {
      const mockCanvas = createMockCanvas();
      const debounceMs = 100;

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any, debounceMs })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      expect(result.current.historySize).toBe(1);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      act(() => {
        vi.advanceTimersByTime(debounceMs + 50);
      });

      expect(result.current.historySize).toBe(2);
    });

    it('saves on object:removed event', () => {
      const mockCanvas = createMockCanvas();
      const debounceMs = 100;

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any, debounceMs })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      expect(result.current.historySize).toBe(1);

      act(() => {
        mockCanvas._triggerEvent('object:removed');
      });

      act(() => {
        vi.advanceTimersByTime(debounceMs + 50);
      });

      expect(result.current.historySize).toBe(2);
    });
  });

  describe('keyboard shortcuts', () => {
    it('handles Ctrl+Z for undo', async () => {
      const mockCanvas = createMockCanvas();

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        result.current.saveState();
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.historySize).toBe(2);

      // Simulate Ctrl+Z
      await act(async () => {
        const event = new KeyboardEvent('keydown', {
          key: 'z',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
        await vi.runAllTimersAsync();
      });

      expect(result.current.historySize).toBe(1);
    });

    it('handles Ctrl+Shift+Z for redo', async () => {
      const mockCanvas = createMockCanvas();

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        result.current.saveState();
      });

      await act(async () => {
        result.current.undo();
        await vi.runAllTimersAsync();
      });

      expect(result.current.canRedo).toBe(true);

      // Simulate Ctrl+Shift+Z
      await act(async () => {
        const event = new KeyboardEvent('keydown', {
          key: 'z',
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
        await vi.runAllTimersAsync();
      });

      expect(result.current.canRedo).toBe(false);
    });

    it('handles Ctrl+Y for redo on Windows', async () => {
      const mockCanvas = createMockCanvas();

      // Mock navigator.platform for Windows
      const originalPlatform = navigator.platform;
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });

      const { result } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        result.current.saveState();
      });

      await act(async () => {
        result.current.undo();
        await vi.runAllTimersAsync();
      });

      expect(result.current.canRedo).toBe(true);

      // Simulate Ctrl+Y
      await act(async () => {
        const event = new KeyboardEvent('keydown', {
          key: 'y',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
        await vi.runAllTimersAsync();
      });

      expect(result.current.canRedo).toBe(false);

      // Restore original platform
      Object.defineProperty(navigator, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
    });
  });

  describe('cleanup', () => {
    it('removes event listeners on unmount', () => {
      const mockCanvas = createMockCanvas();

      const { unmount } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      unmount();

      expect(mockCanvas.off).toHaveBeenCalledWith(
        'object:modified',
        expect.any(Function)
      );
      expect(mockCanvas.off).toHaveBeenCalledWith(
        'object:added',
        expect.any(Function)
      );
      expect(mockCanvas.off).toHaveBeenCalledWith(
        'object:removed',
        expect.any(Function)
      );
    });

    it('clears debounce timer on unmount', () => {
      const mockCanvas = createMockCanvas();
      const debounceMs = 1000;

      const { unmount } = renderHook(() =>
        useCanvasHistory({ canvas: mockCanvas as any, debounceMs })
      );

      // Run initial effect
      act(() => {
        vi.runAllTimers();
      });

      // Trigger an event to start debounce timer
      act(() => {
        mockCanvas._triggerEvent('object:modified');
      });

      // Unmount before timer completes
      unmount();

      // Advance timers - should not cause any issues
      act(() => {
        vi.advanceTimersByTime(debounceMs + 100);
      });

      // No errors should occur
    });
  });
});
