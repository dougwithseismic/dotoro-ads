'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import {
  Plus,
  Copy,
  Lock,
  Unlock,
  Trash2,
  ChevronDown,
  Type,
  Image,
  Square,
  Circle,
  Minus,
} from 'lucide-react';
import { useCanvas } from './CanvasContext';
import { useFabricCanvas } from './hooks/useFabricCanvas';
import styles from './LayersPanel.module.css';

/**
 * Layer type configuration for the dropdown
 */
interface LayerTypeConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

/**
 * LayerControls Props
 */
export interface LayerControlsProps {
  /** Additional CSS class name */
  className?: string;
}

/**
 * LayerControls - Quick actions for layer management
 *
 * Features:
 * - "Add Layer" dropdown with layer types (Text, Image, Rectangle, Circle, Line)
 * - Quick actions: Duplicate, Lock/Unlock, Delete
 */
export function LayerControls({ className }: LayerControlsProps) {
  const { selectedObjects, canvas } = useCanvas();
  const { addText, addRect, addCircle, addLine, deleteSelected, duplicateSelected } = useFabricCanvas();

  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasSelection = selectedObjects.length > 0;
  const selectedObject = selectedObjects[0];
  const isLocked = selectedObject?.lockMovementX && selectedObject?.lockMovementY;

  /**
   * Layer types available for creation
   */
  const layerTypes: LayerTypeConfig[] = [
    {
      id: 'text',
      label: 'Text',
      icon: <Type size={16} />,
      action: () => {
        addText();
        setShowAddDropdown(false);
      },
    },
    {
      id: 'image',
      label: 'Image',
      icon: <Image size={16} />,
      action: () => {
        // For image, we'd typically open a file picker or asset browser
        // For now, just close dropdown - actual implementation would handle file upload
        setShowAddDropdown(false);
      },
    },
    {
      id: 'rectangle',
      label: 'Rectangle',
      icon: <Square size={16} />,
      action: () => {
        addRect();
        setShowAddDropdown(false);
      },
    },
    {
      id: 'circle',
      label: 'Circle',
      icon: <Circle size={16} />,
      action: () => {
        addCircle();
        setShowAddDropdown(false);
      },
    },
    {
      id: 'line',
      label: 'Line',
      icon: <Minus size={16} />,
      action: () => {
        addLine();
        setShowAddDropdown(false);
      },
    },
  ];

  /**
   * Toggle lock state of selected object
   */
  const toggleLock = useCallback(() => {
    if (!canvas || !selectedObject) return;

    const newLockState = !isLocked;

    selectedObject.set({
      lockMovementX: newLockState,
      lockMovementY: newLockState,
      lockRotation: newLockState,
      lockScalingX: newLockState,
      lockScalingY: newLockState,
      hasControls: !newLockState,
      selectable: true, // Keep selectable to allow unlock
    });

    canvas.renderAll();
  }, [canvas, selectedObject, isLocked]);

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAddDropdown(false);
      }
    };

    if (showAddDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddDropdown]);

  /**
   * Handle keyboard navigation in dropdown
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setShowAddDropdown(false);
    }
  }, []);

  return (
    <div className={`${styles.layerControls} ${className ?? ''}`}>
      {/* Add Layer Dropdown */}
      <div className={styles.dropdownContainer} ref={dropdownRef}>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => setShowAddDropdown(!showAddDropdown)}
          onKeyDown={handleKeyDown}
          aria-haspopup="menu"
          aria-expanded={showAddDropdown}
          aria-label="Add layer"
        >
          <Plus size={16} />
          <span>Add Layer</span>
          <ChevronDown size={14} className={showAddDropdown ? styles.rotated : ''} />
        </button>

        {showAddDropdown && (
          <div className={styles.dropdown} role="menu">
            {layerTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                className={styles.dropdownItem}
                onClick={type.action}
                role="menuitem"
              >
                {type.icon}
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={duplicateSelected}
          disabled={!hasSelection}
          title="Duplicate layer"
          aria-label="Duplicate layer"
        >
          <Copy size={16} />
        </button>

        <button
          type="button"
          className={`${styles.actionButton} ${isLocked ? styles.active : ''}`}
          onClick={toggleLock}
          disabled={!hasSelection}
          title={isLocked ? 'Unlock layer' : 'Lock layer'}
          aria-label={isLocked ? 'Unlock layer' : 'Lock layer'}
          aria-pressed={isLocked}
        >
          {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
        </button>

        <button
          type="button"
          className={`${styles.actionButton} ${styles.destructive}`}
          onClick={deleteSelected}
          disabled={!hasSelection}
          title="Delete layer"
          aria-label="Delete layer"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default LayerControls;
