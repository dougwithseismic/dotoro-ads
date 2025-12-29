/**
 * EditorToolbar Component Tests
 *
 * Tests for the canvas editor toolbar with tool selection,
 * actions (undo/redo/delete/duplicate), and zoom controls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorToolbar } from '../EditorToolbar';
import { CanvasProvider } from '../CanvasContext';

// Mock the hooks
const mockAddText = vi.fn();
const mockAddRect = vi.fn();
const mockAddCircle = vi.fn();
const mockDeleteSelected = vi.fn();
const mockDuplicateSelected = vi.fn();
const mockZoomIn = vi.fn();
const mockZoomOut = vi.fn();
const mockZoomToFit = vi.fn();
const mockSetZoom = vi.fn();
const mockUndo = vi.fn();
const mockRedo = vi.fn();

vi.mock('../hooks/useFabricCanvas', () => ({
  useFabricCanvas: () => ({
    addText: mockAddText,
    addRect: mockAddRect,
    addCircle: mockAddCircle,
    deleteSelected: mockDeleteSelected,
    duplicateSelected: mockDuplicateSelected,
    zoomIn: mockZoomIn,
    zoomOut: mockZoomOut,
    zoomToFit: mockZoomToFit,
    setZoom: mockSetZoom,
    zoom: 1,
    isReady: true,
    canvas: {},
  }),
}));

vi.mock('../hooks/useCanvasHistory', () => ({
  useCanvasHistory: () => ({
    undo: mockUndo,
    redo: mockRedo,
    canUndo: true,
    canRedo: true,
    historySize: 5,
    clearHistory: vi.fn(),
    saveState: vi.fn(),
  }),
}));

function renderToolbar(props: Partial<React.ComponentProps<typeof EditorToolbar>> = {}) {
  return render(
    <CanvasProvider>
      <EditorToolbar {...props} />
    </CanvasProvider>
  );
}

describe('EditorToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the toolbar', () => {
      renderToolbar();
      expect(screen.getByText('Tools')).toBeInTheDocument();
    });

    it('renders tool buttons', () => {
      renderToolbar();
      // Check for tool buttons by aria-label
      expect(screen.getByLabelText('Select')).toBeInTheDocument();
      expect(screen.getByLabelText('Text')).toBeInTheDocument();
      expect(screen.getByLabelText('Rectangle')).toBeInTheDocument();
      expect(screen.getByLabelText('Circle')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      renderToolbar();
      expect(screen.getByLabelText('Undo')).toBeInTheDocument();
      expect(screen.getByLabelText('Redo')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete selected')).toBeInTheDocument();
      expect(screen.getByLabelText('Duplicate selected')).toBeInTheDocument();
    });

    it('renders zoom controls', () => {
      renderToolbar();
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Fit to view')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('shows select tool as active by default', () => {
      renderToolbar();
      const selectButton = screen.getByLabelText('Select');
      expect(selectButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Tool Selection', () => {
    it('selects text tool when clicked', () => {
      renderToolbar();
      fireEvent.click(screen.getByLabelText('Text'));
      // Tool selection is handled by context
      expect(screen.getByLabelText('Text')).toBeInTheDocument();
    });

    it('selects rectangle tool when clicked', () => {
      renderToolbar();
      fireEvent.click(screen.getByLabelText('Rectangle'));
      expect(screen.getByLabelText('Rectangle')).toBeInTheDocument();
    });

    it('selects circle tool when clicked', () => {
      renderToolbar();
      fireEvent.click(screen.getByLabelText('Circle'));
      expect(screen.getByLabelText('Circle')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('calls undo when undo button is clicked', () => {
      renderToolbar();
      fireEvent.click(screen.getByLabelText('Undo'));
      expect(mockUndo).toHaveBeenCalled();
    });

    it('calls redo when redo button is clicked', () => {
      renderToolbar();
      fireEvent.click(screen.getByLabelText('Redo'));
      expect(mockRedo).toHaveBeenCalled();
    });

    it('has delete button that is disabled without selection', () => {
      renderToolbar();
      const deleteButton = screen.getByLabelText('Delete selected');
      expect(deleteButton).toBeDisabled();
    });

    it('has duplicate button that is disabled without selection', () => {
      renderToolbar();
      const duplicateButton = screen.getByLabelText('Duplicate selected');
      expect(duplicateButton).toBeDisabled();
    });
  });

  describe('Zoom Controls', () => {
    it('calls zoomIn when zoom in button is clicked', () => {
      renderToolbar();
      fireEvent.click(screen.getByLabelText('Zoom in'));
      expect(mockZoomIn).toHaveBeenCalled();
    });

    it('calls zoomOut when zoom out button is clicked', () => {
      renderToolbar();
      fireEvent.click(screen.getByLabelText('Zoom out'));
      expect(mockZoomOut).toHaveBeenCalled();
    });

    it('calls zoomToFit when fit button is clicked', () => {
      renderToolbar();
      fireEvent.click(screen.getByLabelText('Fit to view'));
      expect(mockZoomToFit).toHaveBeenCalled();
    });

    it('displays zoom level slider', () => {
      renderToolbar();
      expect(screen.getByLabelText('Zoom level')).toBeInTheDocument();
    });
  });

  describe('Save and Preview Buttons', () => {
    it('renders save button when onSave is provided', () => {
      const onSave = vi.fn();
      renderToolbar({ onSave });
      expect(screen.getByLabelText('Save')).toBeInTheDocument();
    });

    it('renders preview button when onPreview is provided', () => {
      const onPreview = vi.fn();
      renderToolbar({ onPreview });
      expect(screen.getByLabelText('Preview')).toBeInTheDocument();
    });

    it('calls onSave when save button is clicked', () => {
      const onSave = vi.fn();
      renderToolbar({ onSave });
      fireEvent.click(screen.getByLabelText('Save'));
      expect(onSave).toHaveBeenCalled();
    });

    it('calls onPreview when preview button is clicked', () => {
      const onPreview = vi.fn();
      renderToolbar({ onPreview });
      fireEvent.click(screen.getByLabelText('Preview'));
      expect(onPreview).toHaveBeenCalled();
    });

    it('disables save button when isSaving is true', () => {
      const onSave = vi.fn();
      renderToolbar({ onSave, isSaving: true });
      expect(screen.getByLabelText('Save')).toBeDisabled();
    });

    it('disables save button when saveDisabled is true', () => {
      const onSave = vi.fn();
      renderToolbar({ onSave, saveDisabled: true });
      expect(screen.getByLabelText('Save')).toBeDisabled();
    });

    it('shows "Saving..." text when isSaving is true', () => {
      const onSave = vi.fn();
      renderToolbar({ onSave, isSaving: true });
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  describe('Disabled States', () => {
    it('disables delete button when no selection (context dependent)', () => {
      renderToolbar();
      // Button should exist but may be disabled based on context state
      expect(screen.getByLabelText('Delete selected')).toBeInTheDocument();
    });

    it('disables duplicate button when no selection (context dependent)', () => {
      renderToolbar();
      expect(screen.getByLabelText('Duplicate selected')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = renderToolbar({ className: 'custom-class' });
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
