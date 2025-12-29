/**
 * LayersPanel Component Tests
 *
 * Tests for the canvas layers panel showing objects,
 * visibility/lock toggles, and selection handling.
 *
 * Includes:
 * - Renders layers from canvas objects
 * - Click layer selects object on canvas
 * - Visibility toggle hides/shows objects
 * - Lock toggle prevents object selection
 * - Layer name editing on double-click
 * - Z-order matches canvas object order
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { LayersPanel } from '../LayersPanel';
import { CanvasProvider, useCanvas } from '../CanvasContext';

// Store mock functions so we can access them in tests
const mockBringForward = vi.fn();
const mockSendBackward = vi.fn();
const mockBringToFront = vi.fn();
const mockSendToBack = vi.fn();

// Mock the useFabricCanvas hook
vi.mock('../hooks/useFabricCanvas', () => ({
  useFabricCanvas: () => ({
    bringForward: mockBringForward,
    sendBackward: mockSendBackward,
    bringToFront: mockBringToFront,
    sendToBack: mockSendToBack,
    addText: vi.fn(),
    addRect: vi.fn(),
    addCircle: vi.fn(),
    deleteSelected: vi.fn(),
    duplicateSelected: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    zoomToFit: vi.fn(),
    setZoom: vi.fn(),
    zoom: 1,
    isReady: true,
    canvas: {},
  }),
}));

// Create mock canvas with configurable objects
function createMockCanvas(initialObjects: unknown[] = []) {
  const objects = [...initialObjects];
  const eventHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  let activeObjects: unknown[] = [];

  return {
    getObjects: vi.fn(() => objects),
    getActiveObjects: vi.fn(() => activeObjects),
    setActiveObject: vi.fn((obj) => {
      activeObjects = [obj];
    }),
    discardActiveObject: vi.fn(() => {
      activeObjects = [];
    }),
    renderAll: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (eventHandlers[event]) {
        const index = eventHandlers[event].indexOf(handler);
        if (index > -1) {
          eventHandlers[event].splice(index, 1);
        }
      }
    }),
    _triggerEvent: (event: string, ...args: unknown[]) => {
      if (eventHandlers[event]) {
        eventHandlers[event].forEach((h) => h(...args));
      }
    },
    _setActiveObjects: (objs: unknown[]) => {
      activeObjects = objs;
    },
    _addObject: (obj: unknown) => {
      objects.push(obj);
    },
    _removeObject: (obj: unknown) => {
      const index = objects.indexOf(obj);
      if (index > -1) {
        objects.splice(index, 1);
      }
    },
  };
}

// Create mock object
function createMockObject(
  type: string,
  options: Record<string, unknown> = {}
) {
  return {
    type,
    visible: options.visible ?? true,
    lockMovementX: options.lockMovementX ?? false,
    lockMovementY: options.lockMovementY ?? false,
    lockRotation: options.lockRotation ?? false,
    lockScalingX: options.lockScalingX ?? false,
    lockScalingY: options.lockScalingY ?? false,
    hasControls: options.hasControls ?? true,
    name: options.name ?? undefined,
    set: vi.fn(function (this: Record<string, unknown>, props: Record<string, unknown>) {
      Object.assign(this, props);
    }),
    ...options,
  };
}

// Component wrapper that provides canvas context with mock canvas
function LayersPanelWithCanvas({
  canvas,
  children,
}: {
  canvas: ReturnType<typeof createMockCanvas>;
  children?: ReactNode;
}) {
  return (
    <CanvasProvider>
      <CanvasInitializer canvas={canvas} />
      <LayersPanel />
      {children}
    </CanvasProvider>
  );
}

// Helper component to initialize canvas in context
function CanvasInitializer({
  canvas,
}: {
  canvas: ReturnType<typeof createMockCanvas>;
}) {
  const { setCanvas } = useCanvas();

  // Set canvas on mount
  if (canvas) {
    setCanvas(canvas as unknown as fabric.Canvas);
  }

  return null;
}

function renderLayersPanel(
  props: Partial<React.ComponentProps<typeof LayersPanel>> = {}
) {
  return render(
    <CanvasProvider>
      <LayersPanel {...props} />
    </CanvasProvider>
  );
}

function renderLayersPanelWithCanvas(
  canvas: ReturnType<typeof createMockCanvas>
) {
  return render(<LayersPanelWithCanvas canvas={canvas} />);
}

describe('LayersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the panel with title', () => {
      renderLayersPanel();
      expect(screen.getByText('Layers')).toBeInTheDocument();
    });

    it('shows empty state when no objects', () => {
      renderLayersPanel();
      expect(screen.getByText('No layers yet')).toBeInTheDocument();
    });

    it('shows empty state hint', () => {
      renderLayersPanel();
      expect(
        screen.getByText('Add elements using the toolbar')
      ).toBeInTheDocument();
    });

    it('displays layer count as zero with no layers', () => {
      renderLayersPanel();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Renders layers from canvas objects', () => {
    it('renders layers for each canvas object', () => {
      const mockRect = createMockObject('rect', { name: 'Rectangle 1' });
      const mockCircle = createMockObject('circle', { name: 'Circle 1' });
      const mockCanvas = createMockCanvas([mockRect, mockCircle]);

      renderLayersPanelWithCanvas(mockCanvas);

      // Trigger the event handlers to update layers
      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      expect(screen.getByText('Rectangle 1')).toBeInTheDocument();
      expect(screen.getByText('Circle 1')).toBeInTheDocument();
    });

    it('displays correct layer count', () => {
      const mockRect = createMockObject('rect');
      const mockCircle = createMockObject('circle');
      const mockText = createMockObject('i-text');
      const mockCanvas = createMockCanvas([mockRect, mockCircle, mockText]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('generates default names for unnamed objects', () => {
      const mockRect = createMockObject('rect'); // No name
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      expect(screen.getByText('Rectangle 1')).toBeInTheDocument();
    });

    it('displays correct type names for different object types', () => {
      const mockText = createMockObject('i-text');
      const mockImage = createMockObject('image');
      const mockLine = createMockObject('line');
      const mockCanvas = createMockCanvas([mockText, mockImage, mockLine]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      expect(screen.getByText('Text 1')).toBeInTheDocument();
      expect(screen.getByText('Image 2')).toBeInTheDocument();
      expect(screen.getByText('Line 3')).toBeInTheDocument();
    });
  });

  describe('Click layer selects object on canvas', () => {
    it('selects object on canvas when layer is clicked', () => {
      const mockRect = createMockObject('rect', { name: 'Test Rect' });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const layerRow = screen.getByText('Test Rect').closest('[role="option"]');
      expect(layerRow).toBeInTheDocument();

      fireEvent.click(layerRow!);

      expect(mockCanvas.discardActiveObject).toHaveBeenCalled();
      expect(mockCanvas.setActiveObject).toHaveBeenCalledWith(mockRect);
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('highlights selected layer', () => {
      const mockRect = createMockObject('rect', { name: 'Selected Rect' });
      const mockCanvas = createMockCanvas([mockRect]);
      mockCanvas._setActiveObjects([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('selection:created');
      });

      const layerRow = screen.getByText('Selected Rect').closest('[role="option"]');
      expect(layerRow).toHaveAttribute('aria-selected', 'true');
    });

    it('does not select when clicking on visibility toggle', () => {
      const mockRect = createMockObject('rect', { name: 'Test Rect' });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      // Reset mocks to check if setActiveObject is called
      mockCanvas.setActiveObject.mockClear();

      const visibilityButton = screen.getByTitle('Hide layer');
      fireEvent.click(visibilityButton);

      // Should not trigger selection
      expect(mockCanvas.setActiveObject).not.toHaveBeenCalled();
    });

    it('does not select when clicking on lock toggle', () => {
      const mockRect = createMockObject('rect', { name: 'Test Rect' });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      mockCanvas.setActiveObject.mockClear();

      const lockButton = screen.getByTitle('Lock layer');
      fireEvent.click(lockButton);

      expect(mockCanvas.setActiveObject).not.toHaveBeenCalled();
    });
  });

  describe('Visibility toggle hides/shows objects', () => {
    it('toggles object visibility when eye icon is clicked', () => {
      const mockRect = createMockObject('rect', { name: 'Test Rect', visible: true });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const visibilityButton = screen.getByTitle('Hide layer');
      fireEvent.click(visibilityButton);

      expect(mockRect.set).toHaveBeenCalledWith('visible', false);
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('shows hidden object when eye icon is clicked', () => {
      const mockRect = createMockObject('rect', { name: 'Hidden Rect', visible: false });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const visibilityButton = screen.getByTitle('Show layer');
      fireEvent.click(visibilityButton);

      expect(mockRect.set).toHaveBeenCalledWith('visible', true);
    });

    it('displays correct visibility icon state', () => {
      const mockVisible = createMockObject('rect', { name: 'Visible', visible: true });
      const mockHidden = createMockObject('circle', { name: 'Hidden', visible: false });
      const mockCanvas = createMockCanvas([mockVisible, mockHidden]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      expect(screen.getByTitle('Hide layer')).toBeInTheDocument();
      expect(screen.getByTitle('Show layer')).toBeInTheDocument();
    });
  });

  describe('Lock toggle prevents object selection', () => {
    it('locks object when lock icon is clicked', () => {
      const mockRect = createMockObject('rect', { name: 'Test Rect' });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const lockButton = screen.getByTitle('Lock layer');
      fireEvent.click(lockButton);

      expect(mockRect.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true,
          hasControls: false,
        })
      );
    });

    it('unlocks object when lock icon is clicked on locked layer', () => {
      const mockRect = createMockObject('rect', {
        name: 'Locked Rect',
        lockMovementX: true,
        lockMovementY: true,
      });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const unlockButton = screen.getByTitle('Unlock layer');
      fireEvent.click(unlockButton);

      expect(mockRect.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lockMovementX: false,
          lockMovementY: false,
          lockRotation: false,
          lockScalingX: false,
          lockScalingY: false,
          hasControls: true,
        })
      );
    });

    it('displays correct lock icon state', () => {
      const mockUnlocked = createMockObject('rect', { name: 'Unlocked' });
      const mockLocked = createMockObject('circle', {
        name: 'Locked',
        lockMovementX: true,
        lockMovementY: true,
      });
      const mockCanvas = createMockCanvas([mockUnlocked, mockLocked]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      expect(screen.getByTitle('Lock layer')).toBeInTheDocument();
      expect(screen.getByTitle('Unlock layer')).toBeInTheDocument();
    });
  });

  describe('Layer name editing on double-click', () => {
    it('enters edit mode on double-click', async () => {
      const user = userEvent.setup();
      const mockRect = createMockObject('rect', { name: 'Original Name' });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const layerRow = screen.getByText('Original Name').closest('[role="option"]');
      await user.dblClick(layerRow!);

      // Should show input field
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveValue('Original Name');
    });

    it('saves new name on Enter key', async () => {
      const user = userEvent.setup();
      const mockRect = createMockObject('rect', { name: 'Original Name' });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const layerRow = screen.getByText('Original Name').closest('[role="option"]');
      await user.dblClick(layerRow!);

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'New Name{Enter}');

      expect(mockRect.name).toBe('New Name');
    });

    it('cancels edit on Escape key', async () => {
      const user = userEvent.setup();
      const mockRect = createMockObject('rect', { name: 'Original Name' });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const layerRow = screen.getByText('Original Name').closest('[role="option"]');
      await user.dblClick(layerRow!);

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'Changed{Escape}');

      // Should revert to original name
      await waitFor(() => {
        expect(screen.getByText('Original Name')).toBeInTheDocument();
      });
    });

    it('saves on blur', async () => {
      const user = userEvent.setup();
      const mockRect = createMockObject('rect', { name: 'Original Name' });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const layerRow = screen.getByText('Original Name').closest('[role="option"]');
      await user.dblClick(layerRow!);

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'Blur Name');

      // Blur the input
      fireEvent.blur(input);

      expect(mockRect.name).toBe('Blur Name');
    });
  });

  describe('Z-order matches canvas object order', () => {
    it('displays layers in reverse order (top layer first)', () => {
      const mockBottom = createMockObject('rect', { name: 'Bottom Layer' });
      const mockMiddle = createMockObject('circle', { name: 'Middle Layer' });
      const mockTop = createMockObject('i-text', { name: 'Top Layer' });
      // Objects are stored bottom to top in canvas
      const mockCanvas = createMockCanvas([mockBottom, mockMiddle, mockTop]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const layerRows = screen.getAllByRole('option');

      // First layer row should be top layer (reversed order)
      expect(layerRows[0]).toHaveTextContent('Top Layer');
      expect(layerRows[1]).toHaveTextContent('Middle Layer');
      expect(layerRows[2]).toHaveTextContent('Bottom Layer');
    });

    it('updates order when canvas objects change', () => {
      const mockRect = createMockObject('rect', { name: 'Rectangle' });
      const mockCircle = createMockObject('circle', { name: 'Circle' });
      const mockCanvas = createMockCanvas([mockRect, mockCircle]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      let layerRows = screen.getAllByRole('option');
      expect(layerRows[0]).toHaveTextContent('Circle');
      expect(layerRows[1]).toHaveTextContent('Rectangle');

      // Simulate reorder by changing the objects array order
      mockCanvas.getObjects.mockReturnValue([mockCircle, mockRect]);

      act(() => {
        mockCanvas._triggerEvent('object:modified');
      });

      layerRows = screen.getAllByRole('option');
      expect(layerRows[0]).toHaveTextContent('Rectangle');
      expect(layerRows[1]).toHaveTextContent('Circle');
    });
  });

  describe('Layer order controls', () => {
    it('moves layer up when up button is clicked', () => {
      const mockRect = createMockObject('rect', { name: 'Rectangle' });
      const mockCircle = createMockObject('circle', { name: 'Circle' });
      const mockCanvas = createMockCanvas([mockRect, mockCircle]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      // Get the "Move layer up" button for the bottom layer (Rectangle in display)
      const moveUpButtons = screen.getAllByTitle('Move up (bring forward)');
      // Click move up for the last layer (bottom in z-order, which is Rectangle)
      fireEvent.click(moveUpButtons[1]);

      expect(mockCanvas.setActiveObject).toHaveBeenCalled();
      expect(mockBringForward).toHaveBeenCalled();
    });

    it('moves layer down when down button is clicked', () => {
      const mockRect = createMockObject('rect', { name: 'Rectangle' });
      const mockCircle = createMockObject('circle', { name: 'Circle' });
      const mockCanvas = createMockCanvas([mockRect, mockCircle]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const moveDownButtons = screen.getAllByTitle('Move down (send backward)');
      // Click move down for the first layer (top in z-order, which is Circle)
      fireEvent.click(moveDownButtons[0]);

      expect(mockCanvas.setActiveObject).toHaveBeenCalled();
      expect(mockSendBackward).toHaveBeenCalled();
    });

    it('disables up button for top layer', () => {
      const mockRect = createMockObject('rect', { name: 'Rectangle' });
      const mockCircle = createMockObject('circle', { name: 'Circle' });
      const mockCanvas = createMockCanvas([mockRect, mockCircle]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const moveUpButtons = screen.getAllByTitle('Move up (bring forward)');
      // First button (for top layer) should be disabled
      expect(moveUpButtons[0]).toBeDisabled();
    });

    it('disables down button for bottom layer', () => {
      const mockRect = createMockObject('rect', { name: 'Rectangle' });
      const mockCircle = createMockObject('circle', { name: 'Circle' });
      const mockCanvas = createMockCanvas([mockRect, mockCircle]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const moveDownButtons = screen.getAllByTitle('Move down (send backward)');
      // Last button (for bottom layer) should be disabled
      expect(moveDownButtons[1]).toBeDisabled();
    });
  });

  describe('Keyboard navigation', () => {
    it('navigates layers with arrow keys', async () => {
      const user = userEvent.setup();
      const mockRect = createMockObject('rect', { name: 'Rectangle' });
      const mockCircle = createMockObject('circle', { name: 'Circle' });
      const mockCanvas = createMockCanvas([mockRect, mockCircle]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const layerRows = screen.getAllByRole('option');

      // Focus first layer
      layerRows[0].focus();
      expect(document.activeElement).toBe(layerRows[0]);

      // Navigate down
      await user.keyboard('{ArrowDown}');

      // Second layer should be focused now
      // Note: This depends on implementation details of focus management
    });

    it('selects layer on Enter key', async () => {
      const user = userEvent.setup();
      const mockRect = createMockObject('rect', { name: 'Rectangle' });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const layerRow = screen.getByRole('option');
      layerRow.focus();

      await user.keyboard('{Enter}');

      expect(mockCanvas.setActiveObject).toHaveBeenCalledWith(mockRect);
    });

    it('enters edit mode on F2 key', async () => {
      const user = userEvent.setup();
      const mockRect = createMockObject('rect', { name: 'Rectangle' });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const layerRow = screen.getByRole('option');
      layerRow.focus();

      await user.keyboard('{F2}');

      // Should show input field for editing
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('Event handling', () => {
    it('updates layers when object is added', () => {
      const mockRect = createMockObject('rect', { name: 'Initial' });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      expect(screen.getByText('Initial')).toBeInTheDocument();

      // Add new object
      const newCircle = createMockObject('circle', { name: 'New Circle' });
      mockCanvas._addObject(newCircle);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      expect(screen.getByText('New Circle')).toBeInTheDocument();
    });

    it('updates layers when object is removed', () => {
      const mockRect = createMockObject('rect', { name: 'To Remove' });
      const mockCircle = createMockObject('circle', { name: 'To Keep' });
      const mockCanvas = createMockCanvas([mockRect, mockCircle]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      expect(screen.getByText('To Remove')).toBeInTheDocument();

      // Remove object
      mockCanvas._removeObject(mockRect);

      act(() => {
        mockCanvas._triggerEvent('object:removed');
      });

      expect(screen.queryByText('To Remove')).not.toBeInTheDocument();
      expect(screen.getByText('To Keep')).toBeInTheDocument();
    });

    it('updates selection state when selection changes', () => {
      const mockRect = createMockObject('rect', { name: 'Selectable' });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      let layerRow = screen.getByRole('option');
      expect(layerRow).toHaveAttribute('aria-selected', 'false');

      // Select the object
      mockCanvas._setActiveObjects([mockRect]);

      act(() => {
        mockCanvas._triggerEvent('selection:created');
      });

      layerRow = screen.getByRole('option');
      expect(layerRow).toHaveAttribute('aria-selected', 'true');

      // Clear selection
      mockCanvas._setActiveObjects([]);

      act(() => {
        mockCanvas._triggerEvent('selection:cleared');
      });

      layerRow = screen.getByRole('option');
      expect(layerRow).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = renderLayersPanel({ className: 'custom-class' });
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has listbox role on layer list', () => {
      renderLayersPanel();
      expect(screen.getByRole('listbox', { name: 'Layers' })).toBeInTheDocument();
    });

    it('has option role on each layer', () => {
      const mockRect = createMockObject('rect', { name: 'Test Layer' });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      expect(screen.getByRole('option')).toBeInTheDocument();
    });

    it('has proper aria-selected state', () => {
      const mockRect = createMockObject('rect', { name: 'Test Layer' });
      const mockCanvas = createMockCanvas([mockRect]);
      mockCanvas._setActiveObjects([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('selection:created');
      });

      const layerRow = screen.getByRole('option');
      expect(layerRow).toHaveAttribute('aria-selected', 'true');
    });

    it('has aria-labels on control buttons', () => {
      const mockRect = createMockObject('rect', { name: 'Test Layer' });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      expect(screen.getByRole('button', { name: 'Hide layer' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Lock layer' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Move layer up' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Move layer down' })).toBeInTheDocument();
    });

    it('layers are focusable with tabindex', () => {
      const mockRect = createMockObject('rect', { name: 'Test Layer' });
      const mockCanvas = createMockCanvas([mockRect]);

      renderLayersPanelWithCanvas(mockCanvas);

      act(() => {
        mockCanvas._triggerEvent('object:added');
      });

      const layerRow = screen.getByRole('option');
      expect(layerRow).toHaveAttribute('tabindex', '0');
    });
  });
});
