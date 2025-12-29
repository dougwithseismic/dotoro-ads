/**
 * PropertiesPanel Component Tests
 *
 * Tests for the properties panel showing object properties,
 * position, size, transform, fill/stroke, and text formatting.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPanel } from '../PropertiesPanel';
import { CanvasProvider } from '../CanvasContext';
import * as CanvasContextModule from '../CanvasContext';

// Create mock canvas
function createMockCanvas() {
  return {
    renderAll: vi.fn(),
    getObjects: vi.fn(() => []),
    getActiveObjects: vi.fn(() => []),
    on: vi.fn(),
    off: vi.fn(),
  };
}

function renderPropertiesPanel(
  props: Partial<React.ComponentProps<typeof PropertiesPanel>> = {}
) {
  const canvas = props.canvas ?? (createMockCanvas() as unknown as fabric.Canvas);
  return render(
    <CanvasProvider>
      <PropertiesPanel canvas={canvas} {...props} />
    </CanvasProvider>
  );
}

describe('PropertiesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('renders the panel with title', () => {
      renderPropertiesPanel();
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });

    it('shows empty state when no object selected', () => {
      renderPropertiesPanel();
      expect(
        screen.getByText('Select an object to edit properties')
      ).toBeInTheDocument();
    });
  });

  describe('Sections', () => {
    it('renders position section header', () => {
      // Empty state renders, no sections visible without selection
      renderPropertiesPanel();
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = renderPropertiesPanel({ className: 'custom-class' });
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('With null canvas', () => {
    it('renders empty state when canvas is null', () => {
      render(
        <CanvasProvider>
          <PropertiesPanel canvas={null} />
        </CanvasProvider>
      );
      expect(
        screen.getByText('Select an object to edit properties')
      ).toBeInTheDocument();
    });
  });

  describe('Panel Structure', () => {
    it('has a header with title', () => {
      renderPropertiesPanel();
      const title = screen.getByText('Properties');
      expect(title.tagName.toLowerCase()).toBe('h3');
    });

    it('shows empty state message when nothing selected', () => {
      renderPropertiesPanel();
      expect(
        screen.getByText('Select an object to edit properties')
      ).toBeInTheDocument();
    });
  });

  describe('With Selected Rectangle Object', () => {
    const mockSetFn = vi.fn();
    const mockRectObject = {
      type: 'rect',
      left: 100,
      top: 50,
      width: 200,
      height: 150,
      scaleX: 1,
      scaleY: 1,
      angle: 45,
      opacity: 0.8,
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidth: 2,
      set: mockSetFn,
    };

    beforeEach(() => {
      mockSetFn.mockClear();
      vi.spyOn(CanvasContextModule, 'useCanvas').mockReturnValue({
        selectedObjects: [mockRectObject as unknown as fabric.FabricObject],
        zoom: 1,
        canvasSize: { width: 800, height: 800 },
        aspectRatio: '1:1',
        isDirty: false,
        variables: [],
        activeTool: 'select',
        isLoading: false,
        error: null,
        canvas: createMockCanvas() as unknown as fabric.Canvas,
        dispatch: vi.fn(),
        setCanvas: vi.fn(),
        selectObjects: vi.fn(),
        clearSelection: vi.fn(),
        setZoom: vi.fn(),
        setCanvasSize: vi.fn(),
        setAspectRatio: vi.fn(),
        markDirty: vi.fn(),
        markClean: vi.fn(),
        updateVariables: vi.fn(),
        setTool: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('renders position section with X and Y inputs', () => {
      renderPropertiesPanel();
      expect(screen.getByText('Position')).toBeInTheDocument();
      expect(screen.getByLabelText('X')).toBeInTheDocument();
      expect(screen.getByLabelText('Y')).toBeInTheDocument();
    });

    it('displays correct X and Y values', () => {
      renderPropertiesPanel();
      const xInput = screen.getByLabelText('X') as HTMLInputElement;
      const yInput = screen.getByLabelText('Y') as HTMLInputElement;
      expect(xInput.value).toBe('100');
      expect(yInput.value).toBe('50');
    });

    it('renders size section with width and height inputs', () => {
      renderPropertiesPanel();
      expect(screen.getByText('Size')).toBeInTheDocument();
      expect(screen.getByLabelText('W')).toBeInTheDocument();
      expect(screen.getByLabelText('H')).toBeInTheDocument();
    });

    it('displays correct width and height values (scaled)', () => {
      renderPropertiesPanel();
      const widthInput = screen.getByLabelText('W') as HTMLInputElement;
      const heightInput = screen.getByLabelText('H') as HTMLInputElement;
      // width = 200 * scaleX(1) = 200
      expect(widthInput.value).toBe('200');
      // height = 150 * scaleY(1) = 150
      expect(heightInput.value).toBe('150');
    });

    it('renders transform section with rotation and opacity', () => {
      renderPropertiesPanel();
      expect(screen.getByText('Transform')).toBeInTheDocument();
      expect(screen.getByLabelText('Rotation')).toBeInTheDocument();
      expect(screen.getByLabelText('Opacity')).toBeInTheDocument();
    });

    it('displays correct rotation value', () => {
      renderPropertiesPanel();
      const rotationInput = screen.getByLabelText('Rotation') as HTMLInputElement;
      expect(rotationInput.value).toBe('45');
    });

    it('displays correct opacity value with percentage', () => {
      renderPropertiesPanel();
      // The range input should have value 0.8, displayed as 80%
      const opacityInput = screen.getByLabelText('Opacity') as HTMLInputElement;
      expect(opacityInput.value).toBe('0.8');
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('renders fill and stroke section for shape objects', () => {
      renderPropertiesPanel();
      expect(screen.getByText('Fill & Stroke')).toBeInTheDocument();
      expect(screen.getByLabelText('Fill')).toBeInTheDocument();
      expect(screen.getByLabelText('Stroke')).toBeInTheDocument();
      expect(screen.getByLabelText('Stroke Width')).toBeInTheDocument();
    });

    it('displays correct fill and stroke colors', () => {
      renderPropertiesPanel();
      const fillInput = screen.getByLabelText('Fill') as HTMLInputElement;
      const strokeInput = screen.getByLabelText('Stroke') as HTMLInputElement;
      expect(fillInput.value).toBe('#ff0000');
      expect(strokeInput.value).toBe('#000000');
    });

    it('displays correct stroke width', () => {
      renderPropertiesPanel();
      const strokeWidthInput = screen.getByLabelText('Stroke Width') as HTMLInputElement;
      expect(strokeWidthInput.value).toBe('2');
    });

    it('renders aspect ratio lock button', () => {
      renderPropertiesPanel();
      const lockButton = screen.getByRole('button', { name: /aspect ratio/i });
      expect(lockButton).toBeInTheDocument();
    });
  });

  describe('With Selected Text Object', () => {
    const mockSetFn = vi.fn();
    const mockTextObject = {
      type: 'i-text',
      left: 50,
      top: 100,
      width: 150,
      height: 30,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      opacity: 1,
      fill: '#333333',
      fontSize: 24,
      set: mockSetFn,
    };

    beforeEach(() => {
      mockSetFn.mockClear();
      vi.spyOn(CanvasContextModule, 'useCanvas').mockReturnValue({
        selectedObjects: [mockTextObject as unknown as fabric.FabricObject],
        zoom: 1,
        canvasSize: { width: 800, height: 800 },
        aspectRatio: '1:1',
        isDirty: false,
        variables: [],
        activeTool: 'select',
        isLoading: false,
        error: null,
        canvas: createMockCanvas() as unknown as fabric.Canvas,
        dispatch: vi.fn(),
        setCanvas: vi.fn(),
        selectObjects: vi.fn(),
        clearSelection: vi.fn(),
        setZoom: vi.fn(),
        setCanvasSize: vi.fn(),
        setAspectRatio: vi.fn(),
        markDirty: vi.fn(),
        markClean: vi.fn(),
        updateVariables: vi.fn(),
        setTool: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('renders text section for text objects', () => {
      renderPropertiesPanel();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('renders font size input for text objects', () => {
      renderPropertiesPanel();
      expect(screen.getByLabelText('Font Size')).toBeInTheDocument();
    });

    it('displays correct font size value', () => {
      renderPropertiesPanel();
      const fontSizeInput = screen.getByLabelText('Font Size') as HTMLInputElement;
      expect(fontSizeInput.value).toBe('24');
    });

    it('renders color input for text objects', () => {
      renderPropertiesPanel();
      expect(screen.getByLabelText('Color')).toBeInTheDocument();
    });

    it('displays correct text color', () => {
      renderPropertiesPanel();
      const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
      expect(colorInput.value).toBe('#333333');
    });

    it('does not render Fill & Stroke section for text objects', () => {
      renderPropertiesPanel();
      expect(screen.queryByText('Fill & Stroke')).not.toBeInTheDocument();
    });

    it('still renders position, size, and transform sections', () => {
      renderPropertiesPanel();
      expect(screen.getByText('Position')).toBeInTheDocument();
      expect(screen.getByText('Size')).toBeInTheDocument();
      expect(screen.getByText('Transform')).toBeInTheDocument();
    });
  });

  describe('Input Interactions', () => {
    const mockSetFn = vi.fn();
    const mockMarkDirty = vi.fn();
    const mockRenderAll = vi.fn();

    const mockRectObject = {
      type: 'rect',
      left: 100,
      top: 50,
      width: 200,
      height: 150,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      opacity: 1,
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidth: 1,
      set: mockSetFn,
    };

    const mockCanvas = {
      renderAll: mockRenderAll,
      getObjects: vi.fn(() => []),
      getActiveObjects: vi.fn(() => []),
      on: vi.fn(),
      off: vi.fn(),
    };

    beforeEach(() => {
      mockSetFn.mockClear();
      mockMarkDirty.mockClear();
      mockRenderAll.mockClear();
      vi.spyOn(CanvasContextModule, 'useCanvas').mockReturnValue({
        selectedObjects: [mockRectObject as unknown as fabric.FabricObject],
        zoom: 1,
        canvasSize: { width: 800, height: 800 },
        aspectRatio: '1:1',
        isDirty: false,
        variables: [],
        activeTool: 'select',
        isLoading: false,
        error: null,
        canvas: mockCanvas as unknown as fabric.Canvas,
        dispatch: vi.fn(),
        setCanvas: vi.fn(),
        selectObjects: vi.fn(),
        clearSelection: vi.fn(),
        setZoom: vi.fn(),
        setCanvasSize: vi.fn(),
        setAspectRatio: vi.fn(),
        markDirty: mockMarkDirty,
        markClean: vi.fn(),
        updateVariables: vi.fn(),
        setTool: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('updates X position when input changes', () => {
      render(
        <CanvasProvider>
          <PropertiesPanel canvas={mockCanvas as unknown as fabric.Canvas} />
        </CanvasProvider>
      );
      const xInput = screen.getByLabelText('X');
      fireEvent.change(xInput, { target: { value: '150' } });
      expect(mockSetFn).toHaveBeenCalledWith('left', 150);
      expect(mockRenderAll).toHaveBeenCalled();
      expect(mockMarkDirty).toHaveBeenCalled();
    });

    it('updates Y position when input changes', () => {
      render(
        <CanvasProvider>
          <PropertiesPanel canvas={mockCanvas as unknown as fabric.Canvas} />
        </CanvasProvider>
      );
      const yInput = screen.getByLabelText('Y');
      fireEvent.change(yInput, { target: { value: '75' } });
      expect(mockSetFn).toHaveBeenCalledWith('top', 75);
      expect(mockRenderAll).toHaveBeenCalled();
    });

    it('updates rotation when input changes', () => {
      render(
        <CanvasProvider>
          <PropertiesPanel canvas={mockCanvas as unknown as fabric.Canvas} />
        </CanvasProvider>
      );
      const rotationInput = screen.getByLabelText('Rotation');
      fireEvent.change(rotationInput, { target: { value: '90' } });
      expect(mockSetFn).toHaveBeenCalledWith('angle', 90);
    });

    it('toggles aspect ratio lock when button is clicked', () => {
      render(
        <CanvasProvider>
          <PropertiesPanel canvas={mockCanvas as unknown as fabric.Canvas} />
        </CanvasProvider>
      );
      const lockButton = screen.getByRole('button', { name: /aspect ratio/i });
      // Initially locked
      expect(lockButton).toHaveAttribute('title', 'Unlock aspect ratio');
      fireEvent.click(lockButton);
      // Now unlocked
      expect(lockButton).toHaveAttribute('title', 'Lock aspect ratio');
    });
  });

  describe('Edge Cases', () => {
    it('handles object with missing fill gracefully', () => {
      const mockObject = {
        type: 'rect',
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        opacity: 1,
        fill: undefined,
        stroke: undefined,
        strokeWidth: 0,
        set: vi.fn(),
      };

      vi.spyOn(CanvasContextModule, 'useCanvas').mockReturnValue({
        selectedObjects: [mockObject as unknown as fabric.FabricObject],
        zoom: 1,
        canvasSize: { width: 800, height: 800 },
        aspectRatio: '1:1',
        isDirty: false,
        variables: [],
        activeTool: 'select',
        isLoading: false,
        error: null,
        canvas: createMockCanvas() as unknown as fabric.Canvas,
        dispatch: vi.fn(),
        setCanvas: vi.fn(),
        selectObjects: vi.fn(),
        clearSelection: vi.fn(),
        setZoom: vi.fn(),
        setCanvasSize: vi.fn(),
        setAspectRatio: vi.fn(),
        markDirty: vi.fn(),
        markClean: vi.fn(),
        updateVariables: vi.fn(),
        setTool: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      renderPropertiesPanel();
      // Should default to #000000 when fill/stroke is undefined
      const fillInput = screen.getByLabelText('Fill') as HTMLInputElement;
      expect(fillInput.value).toBe('#000000');
    });

    it('handles non-hex fill color gracefully', () => {
      const mockObject = {
        type: 'rect',
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        opacity: 1,
        fill: 'rgba(255, 0, 0, 1)', // Non-hex color
        stroke: '#000000',
        strokeWidth: 0,
        set: vi.fn(),
      };

      vi.spyOn(CanvasContextModule, 'useCanvas').mockReturnValue({
        selectedObjects: [mockObject as unknown as fabric.FabricObject],
        zoom: 1,
        canvasSize: { width: 800, height: 800 },
        aspectRatio: '1:1',
        isDirty: false,
        variables: [],
        activeTool: 'select',
        isLoading: false,
        error: null,
        canvas: createMockCanvas() as unknown as fabric.Canvas,
        dispatch: vi.fn(),
        setCanvas: vi.fn(),
        selectObjects: vi.fn(),
        clearSelection: vi.fn(),
        setZoom: vi.fn(),
        setCanvasSize: vi.fn(),
        setAspectRatio: vi.fn(),
        markDirty: vi.fn(),
        markClean: vi.fn(),
        updateVariables: vi.fn(),
        setTool: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      renderPropertiesPanel();
      // Non-hex colors should default to #000000
      const fillInput = screen.getByLabelText('Fill') as HTMLInputElement;
      expect(fillInput.value).toBe('#000000');
    });

    it('handles textbox type as text object', () => {
      const mockTextboxObject = {
        type: 'textbox',
        left: 0,
        top: 0,
        width: 100,
        height: 50,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        opacity: 1,
        fill: '#000000',
        fontSize: 16,
        set: vi.fn(),
      };

      vi.spyOn(CanvasContextModule, 'useCanvas').mockReturnValue({
        selectedObjects: [mockTextboxObject as unknown as fabric.FabricObject],
        zoom: 1,
        canvasSize: { width: 800, height: 800 },
        aspectRatio: '1:1',
        isDirty: false,
        variables: [],
        activeTool: 'select',
        isLoading: false,
        error: null,
        canvas: createMockCanvas() as unknown as fabric.Canvas,
        dispatch: vi.fn(),
        setCanvas: vi.fn(),
        selectObjects: vi.fn(),
        clearSelection: vi.fn(),
        setZoom: vi.fn(),
        setCanvasSize: vi.fn(),
        setAspectRatio: vi.fn(),
        markDirty: vi.fn(),
        markClean: vi.fn(),
        updateVariables: vi.fn(),
        setTool: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      renderPropertiesPanel();
      // Should render Text section, not Fill & Stroke
      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.queryByText('Fill & Stroke')).not.toBeInTheDocument();
    });

    it('handles text type as text object', () => {
      const mockTextObject = {
        type: 'text',
        left: 0,
        top: 0,
        width: 100,
        height: 50,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        opacity: 1,
        fill: '#000000',
        fontSize: 16,
        set: vi.fn(),
      };

      vi.spyOn(CanvasContextModule, 'useCanvas').mockReturnValue({
        selectedObjects: [mockTextObject as unknown as fabric.FabricObject],
        zoom: 1,
        canvasSize: { width: 800, height: 800 },
        aspectRatio: '1:1',
        isDirty: false,
        variables: [],
        activeTool: 'select',
        isLoading: false,
        error: null,
        canvas: createMockCanvas() as unknown as fabric.Canvas,
        dispatch: vi.fn(),
        setCanvas: vi.fn(),
        selectObjects: vi.fn(),
        clearSelection: vi.fn(),
        setZoom: vi.fn(),
        setCanvasSize: vi.fn(),
        setAspectRatio: vi.fn(),
        markDirty: vi.fn(),
        markClean: vi.fn(),
        updateVariables: vi.fn(),
        setTool: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      });

      renderPropertiesPanel();
      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.queryByText('Fill & Stroke')).not.toBeInTheDocument();
    });
  });
});
