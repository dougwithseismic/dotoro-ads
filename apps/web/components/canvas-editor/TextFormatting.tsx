'use client';

import { useCallback, useEffect, useState } from 'react';
import type * as fabric from 'fabric';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
} from 'lucide-react';
import { useCanvas } from './CanvasContext';
import styles from './TextFormatting.module.css';

/**
 * Font family options
 */
const FONT_FAMILIES = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Palatino Linotype', label: 'Palatino' },
];

/**
 * Font size presets
 */
const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96];

/**
 * Text alignment options
 */
type TextAlign = 'left' | 'center' | 'right';

/**
 * TextFormatting Props
 */
export interface TextFormattingProps {
  /** Additional CSS class name */
  className?: string;
}

/**
 * Check if object is a text object
 */
function isTextObject(obj: fabric.FabricObject): obj is fabric.IText {
  return obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox';
}

/**
 * TextFormatting - Panel for text formatting options
 *
 * Features:
 * - Font family selector
 * - Font size input with presets
 * - Bold, Italic, Underline toggles
 * - Text alignment (Left, Center, Right)
 * - Text color picker
 * - Letter spacing and line height (optional)
 */
export function TextFormatting({ className }: TextFormattingProps) {
  const { canvas, selectedObjects, markDirty } = useCanvas();

  // Text formatting state
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState(24);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<TextAlign>('left');
  const [textColor, setTextColor] = useState('#000000');
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.16);

  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);

  // Get selected text object
  const textObject = selectedObjects.find(isTextObject);
  const hasTextSelection = Boolean(textObject);

  /**
   * Update state from selected text object
   */
  useEffect(() => {
    if (!textObject) return;

    setFontFamily(textObject.fontFamily ?? 'Arial');
    setFontSize(textObject.fontSize ?? 24);
    setIsBold(textObject.fontWeight === 'bold' || textObject.fontWeight === 700);
    setIsItalic(textObject.fontStyle === 'italic');
    setIsUnderline(textObject.underline === true);
    setTextAlign((textObject.textAlign as TextAlign) ?? 'left');
    setTextColor(typeof textObject.fill === 'string' ? textObject.fill : '#000000');
    setLetterSpacing(textObject.charSpacing ?? 0);
    setLineHeight(textObject.lineHeight ?? 1.16);
  }, [textObject]);

  /**
   * Apply property to text object
   */
  const applyProperty = useCallback(<K extends keyof fabric.IText>(
    property: K,
    value: fabric.IText[K]
  ) => {
    if (!canvas || !textObject) return;

    textObject.set(property, value);
    canvas.renderAll();
    markDirty();
  }, [canvas, textObject, markDirty]);

  /**
   * Handle font family change
   */
  const handleFontFamilyChange = useCallback((family: string) => {
    setFontFamily(family);
    applyProperty('fontFamily', family);
    setShowFontDropdown(false);
  }, [applyProperty]);

  /**
   * Handle font size change
   */
  const handleFontSizeChange = useCallback((size: number) => {
    const clampedSize = Math.max(1, Math.min(500, size));
    setFontSize(clampedSize);
    applyProperty('fontSize', clampedSize);
    setShowSizeDropdown(false);
  }, [applyProperty]);

  /**
   * Handle font size input change
   */
  const handleFontSizeInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      handleFontSizeChange(value);
    }
  }, [handleFontSizeChange]);

  /**
   * Toggle bold
   */
  const toggleBold = useCallback(() => {
    const newBold = !isBold;
    setIsBold(newBold);
    applyProperty('fontWeight', newBold ? 'bold' : 'normal');
  }, [isBold, applyProperty]);

  /**
   * Toggle italic
   */
  const toggleItalic = useCallback(() => {
    const newItalic = !isItalic;
    setIsItalic(newItalic);
    applyProperty('fontStyle', newItalic ? 'italic' : 'normal');
  }, [isItalic, applyProperty]);

  /**
   * Toggle underline
   */
  const toggleUnderline = useCallback(() => {
    const newUnderline = !isUnderline;
    setIsUnderline(newUnderline);
    applyProperty('underline', newUnderline);
  }, [isUnderline, applyProperty]);

  /**
   * Handle text alignment change
   */
  const handleAlignChange = useCallback((align: TextAlign) => {
    setTextAlign(align);
    applyProperty('textAlign', align);
  }, [applyProperty]);

  /**
   * Handle color change
   */
  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setTextColor(color);
    applyProperty('fill', color);
  }, [applyProperty]);

  /**
   * Handle letter spacing change
   */
  const handleLetterSpacingChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setLetterSpacing(value);
      applyProperty('charSpacing', value);
    }
  }, [applyProperty]);

  /**
   * Handle line height change
   */
  const handleLineHeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setLineHeight(value);
      applyProperty('lineHeight', value);
    }
  }, [applyProperty]);

  // Don't render if no text is selected
  if (!hasTextSelection) {
    return null;
  }

  return (
    <div className={`${styles.panel} ${className ?? ''}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Text Formatting</span>
      </div>

      <div className={styles.content}>
        {/* Font Family */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Font</label>
          <div className={styles.dropdownContainer}>
            <button
              type="button"
              className={styles.selectButton}
              onClick={() => setShowFontDropdown(!showFontDropdown)}
              aria-haspopup="listbox"
              aria-expanded={showFontDropdown}
            >
              <span style={{ fontFamily }}>{fontFamily}</span>
              <ChevronDown size={14} />
            </button>
            {showFontDropdown && (
              <div className={styles.dropdown} role="listbox">
                {FONT_FAMILIES.map((font) => (
                  <button
                    key={font.value}
                    type="button"
                    className={`${styles.dropdownItem} ${fontFamily === font.value ? styles.active : ''}`}
                    onClick={() => handleFontFamilyChange(font.value)}
                    role="option"
                    aria-selected={fontFamily === font.value}
                    style={{ fontFamily: font.value }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Font Size */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Size</label>
          <div className={styles.sizeControl}>
            <div className={styles.dropdownContainer}>
              <button
                type="button"
                className={styles.sizeButton}
                onClick={() => setShowSizeDropdown(!showSizeDropdown)}
                aria-haspopup="listbox"
                aria-expanded={showSizeDropdown}
              >
                <span>{fontSize}</span>
                <ChevronDown size={14} />
              </button>
              {showSizeDropdown && (
                <div className={styles.dropdown} role="listbox">
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`${styles.dropdownItem} ${fontSize === size ? styles.active : ''}`}
                      onClick={() => handleFontSizeChange(size)}
                      role="option"
                      aria-selected={fontSize === size}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="number"
              value={fontSize}
              onChange={handleFontSizeInputChange}
              min={1}
              max={500}
              className={styles.numberInput}
              aria-label="Font size"
            />
          </div>
        </div>

        {/* Style Toggles */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Style</label>
          <div className={styles.toggleGroup}>
            <button
              type="button"
              className={`${styles.toggleButton} ${isBold ? styles.active : ''}`}
              onClick={toggleBold}
              title="Bold (Ctrl+B)"
              aria-label="Bold"
              aria-pressed={isBold}
            >
              <Bold size={16} />
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${isItalic ? styles.active : ''}`}
              onClick={toggleItalic}
              title="Italic (Ctrl+I)"
              aria-label="Italic"
              aria-pressed={isItalic}
            >
              <Italic size={16} />
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${isUnderline ? styles.active : ''}`}
              onClick={toggleUnderline}
              title="Underline (Ctrl+U)"
              aria-label="Underline"
              aria-pressed={isUnderline}
            >
              <Underline size={16} />
            </button>
          </div>
        </div>

        {/* Text Alignment */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Align</label>
          <div className={styles.toggleGroup}>
            <button
              type="button"
              className={`${styles.toggleButton} ${textAlign === 'left' ? styles.active : ''}`}
              onClick={() => handleAlignChange('left')}
              title="Align Left"
              aria-label="Align left"
              aria-pressed={textAlign === 'left'}
            >
              <AlignLeft size={16} />
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${textAlign === 'center' ? styles.active : ''}`}
              onClick={() => handleAlignChange('center')}
              title="Align Center"
              aria-label="Align center"
              aria-pressed={textAlign === 'center'}
            >
              <AlignCenter size={16} />
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${textAlign === 'right' ? styles.active : ''}`}
              onClick={() => handleAlignChange('right')}
              title="Align Right"
              aria-label="Align right"
              aria-pressed={textAlign === 'right'}
            >
              <AlignRight size={16} />
            </button>
          </div>
        </div>

        {/* Text Color */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Color</label>
          <div className={styles.colorControl}>
            <input
              type="color"
              value={textColor}
              onChange={handleColorChange}
              className={styles.colorInput}
              aria-label="Text color"
            />
            <input
              type="text"
              value={textColor}
              onChange={(e) => {
                setTextColor(e.target.value);
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                  applyProperty('fill', e.target.value);
                }
              }}
              className={styles.colorTextInput}
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Letter Spacing */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Letter Spacing</label>
          <div className={styles.sliderControl}>
            <input
              type="range"
              min={-200}
              max={1000}
              value={letterSpacing}
              onChange={handleLetterSpacingChange}
              className={styles.slider}
              aria-label="Letter spacing"
            />
            <input
              type="number"
              value={letterSpacing}
              onChange={handleLetterSpacingChange}
              min={-200}
              max={1000}
              className={styles.numberInputSmall}
            />
          </div>
        </div>

        {/* Line Height */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Line Height</label>
          <div className={styles.sliderControl}>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={lineHeight}
              onChange={handleLineHeightChange}
              className={styles.slider}
              aria-label="Line height"
            />
            <input
              type="number"
              value={lineHeight}
              onChange={handleLineHeightChange}
              min={0.5}
              max={3}
              step={0.1}
              className={styles.numberInputSmall}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TextFormatting;
