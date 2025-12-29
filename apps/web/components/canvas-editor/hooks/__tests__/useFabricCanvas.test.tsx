/**
 * useFabricCanvas Hook Tests
 *
 * Tests for canvas operations including:
 * - Object creation (addText, addRect, addCircle, addImage, addLine)
 * - Selection operations (deleteSelected, duplicateSelected)
 * - Layer operations (bringToFront, sendToBack, bringForward, sendBackward)
 * - Serialization (getCanvasJson, loadFromJson)
 * - Zoom operations (zoomIn, zoomOut, zoomToFit, setZoom, resetZoom)
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { CanvasProvider, useCanvas } from '../../CanvasContext';
import { useFabricCanvas } from '../useFabricCanvas';
import { ZOOM_CONSTRAINTS } from '../../types';

// Mock fabric objects
const createMockFabricObject = (type: string, props: Record<string, unknown> = {}) => ({
  type,
  left: props.left ?? 100,
  top: props.top ?? 100,
  width: props.width ?? 100,
  height: props.height ?? 100,
  set: vi.fn(),
  clone: vi.fn().mockResolvedValue({
    type,
    left: (props.left ?? 100) + 20,
    top: (props.top ?? 100) + 20,
    set: vi.fn(),
    setCoords: vi.fn(),
    canvas: null,
    forEachObject: vi.fn(),
  }),
  setCoords: vi.fn(),
  ...props,
});

// Mock canvas instance
const createMockCanvas = () => {
  const objects: unknown[] = [];
  let activeObject: unknown = null;
  let zoom = 1;

  return {
    add: vi.fn((obj) => {
      objects.push(obj);
    }),
    remove: vi.fn((obj) => {
      const index = objects.indexOf(obj);
      if (index > -1) {
        objects.splice(index, 1);
      }
    }),
    getObjects: vi.fn(() => objects),
    getActiveObject: vi.fn(() => activeObject),
    getActiveObjects: vi.fn(() => (activeObject ? [activeObject] : [])),
    setActiveObject: vi.fn((obj) => {
      activeObject = obj;
    }),
    discardActiveObject: vi.fn(() => {
      activeObject = null;
    }),
    renderAll: vi.fn(),
    dispose: vi.fn(),
    loadFromJSON: vi.fn().mockResolvedValue(undefined),
    toJSON: vi.fn(() => ({
      version: '6.0.0',
      objects: objects.map((o) => ({ type: (o as { type: string }).type })),
    })),
    on: vi.fn(),
    off: vi.fn(),
    bringObjectToFront: vi.fn(),
    sendObjectToBack: vi.fn(),
    bringObjectForward: vi.fn(),
    sendObjectBackwards: vi.fn(),
    setZoom: vi.fn((z) => {
      zoom = z;
    }),
    getZoom: vi.fn(() => zoom),
    width: 800,
    height: 600,
    _setActiveObject: (obj: unknown) => {
      activeObject = obj;
    },
    _clearObjects: () => {
      objects.length = 0;
    },
    _addObject: (obj: unknown) => {
      objects.push(obj);
    },
  };
};

// Mock fabric module with proper class-like constructors
vi.mock('fabric', () => {
  // Create a class-like constructor for IText
  function MockIText(this: unknown, text: string, options?: Record<string, unknown>) {
    return {
      type: 'i-text',
      text,
      ...options,
    };
  }

  // Create a class-like constructor for Rect
  function MockRect(this: unknown, options?: Record<string, unknown>) {
    return {
      type: 'rect',
      ...options,
    };
  }

  // Create a class-like constructor for Circle
  function MockCircle(this: unknown, options?: Record<string, unknown>) {
    return {
      type: 'circle',
      ...options,
    };
  }

  // Create a class-like constructor for Line
  function MockLine(this: unknown, points: number[], options?: Record<string, unknown>) {
    return {
      type: 'line',
      points,
      ...options,
    };
  }

  // Create a class-like constructor for ActiveSelection
  function MockActiveSelection(this: unknown, objects: unknown[], options?: { canvas?: unknown }) {
    return {
      type: 'activeSelection',
      objects,
      canvas: options?.canvas,
      setCoords: vi.fn(),
      forEachObject: vi.fn((fn: (obj: unknown) => void) => objects.forEach(fn)),
    };
  }

  // Create a mock for FabricImage.fromURL
  const mockFromURL = vi.fn().mockResolvedValue({
    type: 'image',
    width: 200,
    height: 150,
    set: vi.fn(),
    scale: vi.fn(),
  });

  return {
    IText: MockIText,
    Rect: MockRect,
    Circle: MockCircle,
    Line: MockLine,
    FabricImage: {
      fromURL: mockFromURL,
    },
    ActiveSelection: MockActiveSelection,
    version: '6.0.0',
  };
});

let mockCanvas: ReturnType<typeof createMockCanvas>;

// Create a wrapper that provides the mock canvas
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <CanvasProvider>{children}</CanvasProvider>;
  };
}

describe('useFabricCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas = createMockCanvas();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('returns isReady false when canvas is null', () => {
      const { result } = renderHook(() => useFabricCanvas(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isReady).toBe(false);
      expect(result.current.canvas).toBeNull();
    });

    it('returns isReady true when canvas is set', () => {
      const { result } = renderHook(
        () => {
          const canvas = useCanvas();
          const fabricCanvas = useFabricCanvas();
          return { canvas, fabricCanvas };
        },
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
      });

      expect(result.current.fabricCanvas.isReady).toBe(true);
    });
  });

  describe('addText', () => {
    it('creates IText object and adds to canvas', () => {
      const { result } = renderHook(
        () => {
          const canvas = useCanvas();
          const fabricCanvas = useFabricCanvas();
          return { canvas, fabricCanvas };
        },
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
      });

      let textObj: unknown;
      act(() => {
        textObj = result.current.fabricCanvas.addText();
      });

      expect(textObj).not.toBeNull();
      expect(mockCanvas.add).toHaveBeenCalled();
      expect(mockCanvas.setActiveObject).toHaveBeenCalled();
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('creates IText object with custom options', () => {
      const { result } = renderHook(
        () => {
          const canvas = useCanvas();
          const fabricCanvas = useFabricCanvas();
          return { canvas, fabricCanvas };
        },
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
      });

      let textObj: { text?: string; fontSize?: number; fill?: string };
      act(() => {
        textObj = result.current.fabricCanvas.addText({
          text: 'Custom Text',
          fontSize: 32,
          fill: '#ff0000',
        }) as typeof textObj;
      });

      expect(textObj.text).toBe('Custom Text');
      expect(textObj.fontSize).toBe(32);
      expect(textObj.fill).toBe('#ff0000');
    });

    it('returns null when canvas is not initialized', () => {
      const { result } = renderHook(() => useFabricCanvas(), {
        wrapper: createWrapper(),
      });

      let textObj: unknown;
      act(() => {
        textObj = result.current.addText();
      });

      expect(textObj).toBeNull();
    });

    it('marks canvas as dirty after adding text', () => {
      const { result } = renderHook(
        () => {
          const canvas = useCanvas();
          const fabricCanvas = useFabricCanvas();
          return { canvas, fabricCanvas };
        },
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
      });

      expect(result.current.canvas.isDirty).toBe(false);

      act(() => {
        result.current.fabricCanvas.addText();
      });

      expect(result.current.canvas.isDirty).toBe(true);
    });
  });

  describe('addRect', () => {
    it('creates rectangle and adds to canvas', () => {
      const { result } = renderHook(
        () => {
          const canvas = useCanvas();
          const fabricCanvas = useFabricCanvas();
          return { canvas, fabricCanvas };
        },
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
      });

      let rectObj: unknown;
      act(() => {
        rectObj = result.current.fabricCanvas.addRect();
      });

      expect(rectObj).not.toBeNull();
      expect(mockCanvas.add).toHaveBeenCalled();
    });

    it('creates rectangle with custom dimensions', () => {
      const { result } = renderHook(
        () => {
          const canvas = useCanvas();
          const fabricCanvas = useFabricCanvas();
          return { canvas, fabricCanvas };
        },
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
      });

      let rectObj: { width?: number; height?: number; fill?: string; rx?: number };
      act(() => {
        rectObj = result.current.fabricCanvas.addRect({
          width: 200,
          height: 150,
          fill: '#00ff00',
          rx: 10,
        }) as typeof rectObj;
      });

      expect(rectObj.width).toBe(200);
      expect(rectObj.height).toBe(150);
      expect(rectObj.fill).toBe('#00ff00');
      expect(rectObj.rx).toBe(10);
    });

    it('returns null when canvas is not initialized', () => {
      const { result } = renderHook(() => useFabricCanvas(), {
        wrapper: createWrapper(),
      });

      let rectObj: unknown;
      act(() => {
        rectObj = result.current.addRect();
      });

      expect(rectObj).toBeNull();
    });
  });

  describe('addCircle', () => {
    it('creates circle and adds to canvas', () => {
      const { result } = renderHook(
        () => {
          const canvas = useCanvas();
          const fabricCanvas = useFabricCanvas();
          return { canvas, fabricCanvas };
        },
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
      });

      let circleObj: unknown;
      act(() => {
        circleObj = result.current.fabricCanvas.addCircle();
      });

      expect(circleObj).not.toBeNull();
      expect(mockCanvas.add).toHaveBeenCalled();
    });

    it('creates circle with custom radius', () => {
      const { result } = renderHook(
        () => {
          const canvas = useCanvas();
          const fabricCanvas = useFabricCanvas();
          return { canvas, fabricCanvas };
        },
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
      });

      let circleObj: { radius?: number; fill?: string };
      act(() => {
        circleObj = result.current.fabricCanvas.addCircle({
          radius: 75,
          fill: '#0000ff',
        }) as typeof circleObj;
      });

      expect(circleObj.radius).toBe(75);
      expect(circleObj.fill).toBe('#0000ff');
    });

    it('returns null when canvas is not initialized', () => {
      const { result } = renderHook(() => useFabricCanvas(), {
        wrapper: createWrapper(),
      });

      let circleObj: unknown;
      act(() => {
        circleObj = result.current.addCircle();
      });

      expect(circleObj).toBeNull();
    });
  });

  describe('addLine', () => {
    it('creates line and adds to canvas', () => {
      const { result } = renderHook(
        () => {
          const canvas = useCanvas();
          const fabricCanvas = useFabricCanvas();
          return { canvas, fabricCanvas };
        },
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
      });

      let lineObj: unknown;
      act(() => {
        lineObj = result.current.fabricCanvas.addLine();
      });

      expect(lineObj).not.toBeNull();
      expect(mockCanvas.add).toHaveBeenCalled();
    });

    it('creates line with custom points', () => {
      const { result } = renderHook(
        () => {
          const canvas = useCanvas();
          const fabricCanvas = useFabricCanvas();
          return { canvas, fabricCanvas };
        },
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
      });

      let lineObj: { points?: number[]; stroke?: string; strokeWidth?: number };
      act(() => {
        lineObj = result.current.fabricCanvas.addLine({
          points: [0, 0, 100, 100],
          stroke: '#ff00ff',
          strokeWidth: 3,
        }) as typeof lineObj;
      });

      expect(lineObj.points).toEqual([0, 0, 100, 100]);
      expect(lineObj.stroke).toBe('#ff00ff');
      expect(lineObj.strokeWidth).toBe(3);
    });
  });

  describe('addImage', () => {
    it('loads and adds image from URL', async () => {
      const { result } = renderHook(
        () => {
          const canvas = useCanvas();
          const fabricCanvas = useFabricCanvas();
          return { canvas, fabricCanvas };
        },
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
      });

      let imageObj: unknown;
      await act(async () => {
        imageObj = await result.current.fabricCanvas.addImage('https://example.com/image.png');
      });

      expect(imageObj).not.toBeNull();
      expect(mockCanvas.add).toHaveBeenCalled();
    });

    it('returns null when canvas is not initialized', async () => {
      const { result } = renderHook(() => useFabricCanvas(), {
        wrapper: createWrapper(),
      });

      let imageObj: unknown;
      await act(async () => {
        imageObj = await result.current.addImage('https://example.com/image.png');
      });

      expect(imageObj).toBeNull();
    });
  });

  describe('deleteSelected', () => {
    it('removes selected objects from canvas', () => {
      const mockObject = createMockFabricObject('rect');
      mockCanvas._addObject(mockObject);
      mockCanvas._setActiveObject(mockObject);
      mockCanvas.getActiveObjects.mockReturnValue([mockObject]);

      const { result } = renderHook(
        () => {
          const canvas = useCanvas();
          const fabricCanvas = useFabricCanvas();
          return { canvas, fabricCanvas };
        },
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
      });

      act(() => {
        result.current.fabricCanvas.deleteSelected();
      });

      expect(mockCanvas.discardActiveObject).toHaveBeenCalled();
      expect(mockCanvas.remove).toHaveBeenCalledWith(mockObject);
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('does nothing when no objects are selected', () => {
      mockCanvas.getActiveObjects.mockReturnValue([]);

      const { result } = renderHook(
        () => {
          const canvas = useCanvas();
          const fabricCanvas = useFabricCanvas();
          return { canvas, fabricCanvas };
        },
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
      });

      act(() => {
        result.current.fabricCanvas.deleteSelected();
      });

      expect(mockCanvas.remove).not.toHaveBeenCalled();
    });

    it('does nothing when canvas is not initialized', () => {
      const { result } = renderHook(() => useFabricCanvas(), {
        wrapper: createWrapper(),
      });

      expect(() => {
        act(() => {
          result.current.deleteSelected();
        });
      }).not.toThrow();
    });
  });

  describe('duplicateSelected', () => {
    it('clones selected object with offset', async () => {
      const mockObject = createMockFabricObject('rect', { left: 100, top: 100 });
      mockCanvas._setActiveObject(mockObject);
      mockCanvas.getActiveObject.mockReturnValue(mockObject);

      const { result } = renderHook(
        () => {
          const canvas = useCanvas();
          const fabricCanvas = useFabricCanvas();
          return { canvas, fabricCanvas };
        },
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
      });

      await act(async () => {
        result.current.fabricCanvas.duplicateSelected();
        // Wait for clone promise to resolve
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockObject.clone).toHaveBeenCalled();
    });

    it('does nothing when no object is selected', () => {
      mockCanvas.getActiveObject.mockReturnValue(null);

      const { result } = renderHook(
        () => {
          const canvas = useCanvas();
          const fabricCanvas = useFabricCanvas();
          return { canvas, fabricCanvas };
        },
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
      });

      act(() => {
        result.current.fabricCanvas.duplicateSelected();
      });

      // Should not throw and should not call add
      expect(mockCanvas.add).not.toHaveBeenCalled();
    });
  });

  describe('Layer Operations', () => {
    describe('bringToFront', () => {
      it('brings selected object to front', () => {
        const mockObject = createMockFabricObject('rect');
        mockCanvas._setActiveObject(mockObject);
        mockCanvas.getActiveObject.mockReturnValue(mockObject);

        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        act(() => {
          result.current.fabricCanvas.bringToFront();
        });

        expect(mockCanvas.bringObjectToFront).toHaveBeenCalledWith(mockObject);
        expect(mockCanvas.renderAll).toHaveBeenCalled();
      });

      it('does nothing when no object is selected', () => {
        mockCanvas.getActiveObject.mockReturnValue(null);

        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        act(() => {
          result.current.fabricCanvas.bringToFront();
        });

        expect(mockCanvas.bringObjectToFront).not.toHaveBeenCalled();
      });
    });

    describe('sendToBack', () => {
      it('sends selected object to back', () => {
        const mockObject = createMockFabricObject('rect');
        mockCanvas._setActiveObject(mockObject);
        mockCanvas.getActiveObject.mockReturnValue(mockObject);

        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        act(() => {
          result.current.fabricCanvas.sendToBack();
        });

        expect(mockCanvas.sendObjectToBack).toHaveBeenCalledWith(mockObject);
        expect(mockCanvas.renderAll).toHaveBeenCalled();
      });
    });

    describe('bringForward', () => {
      it('brings selected object one layer forward', () => {
        const mockObject = createMockFabricObject('rect');
        mockCanvas._setActiveObject(mockObject);
        mockCanvas.getActiveObject.mockReturnValue(mockObject);

        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        act(() => {
          result.current.fabricCanvas.bringForward();
        });

        expect(mockCanvas.bringObjectForward).toHaveBeenCalledWith(mockObject);
        expect(mockCanvas.renderAll).toHaveBeenCalled();
      });
    });

    describe('sendBackward', () => {
      it('sends selected object one layer backward', () => {
        const mockObject = createMockFabricObject('rect');
        mockCanvas._setActiveObject(mockObject);
        mockCanvas.getActiveObject.mockReturnValue(mockObject);

        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        act(() => {
          result.current.fabricCanvas.sendBackward();
        });

        expect(mockCanvas.sendObjectBackwards).toHaveBeenCalledWith(mockObject);
        expect(mockCanvas.renderAll).toHaveBeenCalled();
      });
    });
  });

  describe('Selection Operations', () => {
    describe('deselectAll', () => {
      it('deselects all objects on canvas', () => {
        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        act(() => {
          result.current.fabricCanvas.deselectAll();
        });

        expect(mockCanvas.discardActiveObject).toHaveBeenCalled();
        expect(mockCanvas.renderAll).toHaveBeenCalled();
      });
    });
  });

  describe('Serialization', () => {
    describe('getCanvasJson', () => {
      it('returns valid JSON representation of canvas', () => {
        const mockObjects = [createMockFabricObject('rect')];
        mockCanvas._addObject(mockObjects[0]);

        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        let json: unknown;
        act(() => {
          json = result.current.fabricCanvas.getCanvasJson();
        });

        expect(json).toEqual(
          expect.objectContaining({
            version: '6.0.0',
            objects: expect.any(Array),
          })
        );
      });

      it('includes canvas dimensions in JSON', () => {
        mockCanvas.width = 1920;
        mockCanvas.height = 1080;

        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        let json: { width?: number; height?: number };
        act(() => {
          json = result.current.fabricCanvas.getCanvasJson();
        });

        expect(json.width).toBe(1920);
        expect(json.height).toBe(1080);
      });

      it('returns default JSON when canvas is not initialized', () => {
        const { result } = renderHook(() => useFabricCanvas(), {
          wrapper: createWrapper(),
        });

        let json: unknown;
        act(() => {
          json = result.current.getCanvasJson();
        });

        expect(json).toEqual(
          expect.objectContaining({
            version: expect.any(String),
            objects: [],
          })
        );
      });
    });

    describe('loadFromJson', () => {
      it('loads canvas from JSON', async () => {
        const jsonToLoad = {
          version: '6.0.0',
          objects: [{ type: 'rect', left: 100, top: 100 }],
          width: 800,
          height: 600,
        };

        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        await act(async () => {
          await result.current.fabricCanvas.loadFromJson(jsonToLoad);
        });

        expect(mockCanvas.loadFromJSON).toHaveBeenCalledWith(jsonToLoad);
        expect(mockCanvas.renderAll).toHaveBeenCalled();
      });

      it('throws error when loading fails', async () => {
        mockCanvas.loadFromJSON.mockRejectedValueOnce(new Error('Load failed'));

        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        await expect(
          act(async () => {
            await result.current.fabricCanvas.loadFromJson({
              version: '6.0.0',
              objects: [],
            });
          })
        ).rejects.toThrow('Load failed');

        consoleError.mockRestore();
      });

      it('does nothing when canvas is not initialized', async () => {
        const { result } = renderHook(() => useFabricCanvas(), {
          wrapper: createWrapper(),
        });

        await act(async () => {
          await result.current.loadFromJson({
            version: '6.0.0',
            objects: [],
          });
        });

        // Should not throw
        expect(mockCanvas.loadFromJSON).not.toHaveBeenCalled();
      });
    });
  });

  describe('Zoom Operations', () => {
    describe('zoomIn', () => {
      it('increases zoom by step amount', () => {
        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        const initialZoom = result.current.fabricCanvas.zoom;

        act(() => {
          result.current.fabricCanvas.zoomIn();
        });

        expect(result.current.fabricCanvas.zoom).toBe(
          initialZoom + ZOOM_CONSTRAINTS.STEP
        );
        expect(mockCanvas.setZoom).toHaveBeenCalled();
        expect(mockCanvas.renderAll).toHaveBeenCalled();
      });

      it('does not exceed maximum zoom', () => {
        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        // Set zoom close to max
        act(() => {
          result.current.fabricCanvas.setZoom(ZOOM_CONSTRAINTS.MAX - 0.05);
        });

        act(() => {
          result.current.fabricCanvas.zoomIn();
        });

        expect(result.current.fabricCanvas.zoom).toBe(ZOOM_CONSTRAINTS.MAX);
      });
    });

    describe('zoomOut', () => {
      it('decreases zoom by step amount', () => {
        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        const initialZoom = result.current.fabricCanvas.zoom;

        act(() => {
          result.current.fabricCanvas.zoomOut();
        });

        expect(result.current.fabricCanvas.zoom).toBe(
          initialZoom - ZOOM_CONSTRAINTS.STEP
        );
      });

      it('does not go below minimum zoom', () => {
        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        // Set zoom close to min
        act(() => {
          result.current.fabricCanvas.setZoom(ZOOM_CONSTRAINTS.MIN + 0.05);
        });

        act(() => {
          result.current.fabricCanvas.zoomOut();
        });

        expect(result.current.fabricCanvas.zoom).toBe(ZOOM_CONSTRAINTS.MIN);
      });
    });

    describe('zoomToFit', () => {
      it('resets zoom to 1', () => {
        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        // Set zoom to something other than 1
        act(() => {
          result.current.fabricCanvas.setZoom(2);
        });

        act(() => {
          result.current.fabricCanvas.zoomToFit();
        });

        expect(result.current.fabricCanvas.zoom).toBe(1);
        expect(mockCanvas.setZoom).toHaveBeenCalledWith(1);
      });
    });

    describe('setZoom', () => {
      it('sets zoom to specific level', () => {
        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        act(() => {
          result.current.fabricCanvas.setZoom(2.5);
        });

        expect(result.current.fabricCanvas.zoom).toBe(2.5);
        expect(mockCanvas.setZoom).toHaveBeenCalledWith(2.5);
      });

      it('clamps zoom to constraints', () => {
        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        // Try to set above max
        act(() => {
          result.current.fabricCanvas.setZoom(10);
        });

        expect(result.current.fabricCanvas.zoom).toBe(ZOOM_CONSTRAINTS.MAX);

        // Try to set below min
        act(() => {
          result.current.fabricCanvas.setZoom(0.01);
        });

        expect(result.current.fabricCanvas.zoom).toBe(ZOOM_CONSTRAINTS.MIN);
      });
    });

    describe('resetZoom', () => {
      it('resets zoom to 100%', () => {
        const { result } = renderHook(
          () => {
            const canvas = useCanvas();
            const fabricCanvas = useFabricCanvas();
            return { canvas, fabricCanvas };
          },
          { wrapper: createWrapper() }
        );

        act(() => {
          result.current.canvas.setCanvas(mockCanvas as unknown as fabric.Canvas);
        });

        // Set zoom to something other than 1
        act(() => {
          result.current.fabricCanvas.setZoom(3);
        });

        act(() => {
          result.current.fabricCanvas.resetZoom();
        });

        expect(result.current.fabricCanvas.zoom).toBe(1);
      });
    });
  });
});
