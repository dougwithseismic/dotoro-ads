/**
 * SafeZoneOverlay Component Tests
 *
 * Tests for the safe zone overlay that displays content-safe areas
 * with danger zone indicators.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  SafeZoneOverlay,
  getSafeZonePreset,
  isValidSafeZone,
  SAFE_ZONE_PRESETS,
} from '../SafeZoneOverlay';
import type { SafeZone } from '../types';

// Default test safe zone
const defaultSafeZone: SafeZone = { top: 5, right: 5, bottom: 10, left: 5 };

describe('SafeZoneOverlay', () => {
  describe('Visibility', () => {
    it('renders nothing when visible=false', () => {
      const { container } = render(
        <SafeZoneOverlay
          safeZone={defaultSafeZone}
          canvasWidth={1080}
          canvasHeight={1920}
          visible={false}
        />
      );

      // Container should be empty when not visible
      expect(container.firstChild).toBeNull();
    });

    it('renders overlay when visible=true', () => {
      const { container } = render(
        <SafeZoneOverlay
          safeZone={defaultSafeZone}
          canvasWidth={1080}
          canvasHeight={1920}
          visible={true}
        />
      );

      // Container should have content when visible
      expect(container.firstChild).not.toBeNull();
      expect(container.querySelector('[role="presentation"]')).toBeInTheDocument();
    });

    it('renders Safe Zone label when visible', () => {
      render(
        <SafeZoneOverlay
          safeZone={defaultSafeZone}
          canvasWidth={1080}
          canvasHeight={1920}
          visible={true}
        />
      );

      expect(screen.getByText('Safe Zone')).toBeInTheDocument();
    });
  });

  describe('Pixel Calculations', () => {
    it('calculates correct pixel values from percentages', () => {
      const canvasWidth = 1000;
      const canvasHeight = 2000;
      const safeZone: SafeZone = { top: 10, right: 5, bottom: 15, left: 5 };

      const { container } = render(
        <SafeZoneOverlay
          safeZone={safeZone}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          visible={true}
        />
      );

      // Expected pixel values:
      // top: 10% of 2000 = 200px
      // right: 5% of 1000 = 50px
      // bottom: 15% of 2000 = 300px
      // left: 5% of 1000 = 50px

      // Check top danger zone height
      const topZone = container.querySelector('[data-position="top"]');
      expect(topZone).toHaveStyle({ height: '200px' });

      // Check bottom danger zone height
      const bottomZone = container.querySelector('[data-position="bottom"]');
      expect(bottomZone).toHaveStyle({ height: '300px' });

      // Check left danger zone width
      const leftZone = container.querySelector('[data-position="left"]');
      expect(leftZone).toHaveStyle({ width: '50px' });

      // Check right danger zone width
      const rightZone = container.querySelector('[data-position="right"]');
      expect(rightZone).toHaveStyle({ width: '50px' });
    });

    it('handles zero margin values correctly', () => {
      const safeZone: SafeZone = { top: 0, right: 0, bottom: 0, left: 0 };

      const { container } = render(
        <SafeZoneOverlay
          safeZone={safeZone}
          canvasWidth={1080}
          canvasHeight={1920}
          visible={true}
        />
      );

      const topZone = container.querySelector('[data-position="top"]');
      expect(topZone).toHaveStyle({ height: '0px' });
    });

    it('calculates safe area dimensions correctly', () => {
      const canvasWidth = 1000;
      const canvasHeight = 1000;
      const safeZone: SafeZone = { top: 10, right: 10, bottom: 10, left: 10 };

      const { container } = render(
        <SafeZoneOverlay
          safeZone={safeZone}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          visible={true}
        />
      );

      // Safe area should be 800x800 (1000 - 100 - 100)
      // The left zone height should equal safe height (800px)
      const leftZone = container.querySelector('[data-position="left"]');
      expect(leftZone).toHaveStyle({ height: '800px' });
    });
  });

  describe('Custom className', () => {
    it('applies custom className to overlay', () => {
      const { container } = render(
        <SafeZoneOverlay
          safeZone={defaultSafeZone}
          canvasWidth={1080}
          canvasHeight={1920}
          visible={true}
          className="custom-overlay"
        />
      );

      expect(container.querySelector('.custom-overlay')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has aria-hidden attribute for screen readers', () => {
      const { container } = render(
        <SafeZoneOverlay
          safeZone={defaultSafeZone}
          canvasWidth={1080}
          canvasHeight={1920}
          visible={true}
        />
      );

      const overlay = container.querySelector('[role="presentation"]');
      expect(overlay).toHaveAttribute('aria-hidden', 'true');
    });
  });
});

describe('isValidSafeZone', () => {
  describe('Valid inputs', () => {
    it('returns true for valid safe zone with all values in range', () => {
      const safeZone: SafeZone = { top: 5, right: 5, bottom: 10, left: 5 };
      expect(isValidSafeZone(safeZone)).toBe(true);
    });

    it('returns true for zero values', () => {
      const safeZone: SafeZone = { top: 0, right: 0, bottom: 0, left: 0 };
      expect(isValidSafeZone(safeZone)).toBe(true);
    });

    it('returns true for boundary value of 50', () => {
      const safeZone: SafeZone = { top: 50, right: 50, bottom: 0, left: 0 };
      expect(isValidSafeZone(safeZone)).toBe(true);
    });

    it('returns true when combined top+bottom equals 100', () => {
      const safeZone: SafeZone = { top: 50, right: 0, bottom: 50, left: 0 };
      expect(isValidSafeZone(safeZone)).toBe(true);
    });

    it('returns true when combined left+right equals 100', () => {
      const safeZone: SafeZone = { top: 0, right: 50, bottom: 0, left: 50 };
      expect(isValidSafeZone(safeZone)).toBe(true);
    });

    it('returns true for typical platform presets', () => {
      expect(isValidSafeZone(SAFE_ZONE_PRESETS.default)).toBe(true);
      expect(isValidSafeZone(SAFE_ZONE_PRESETS.reddit)).toBe(true);
      expect(isValidSafeZone(SAFE_ZONE_PRESETS.meta_story)).toBe(true);
      expect(isValidSafeZone(SAFE_ZONE_PRESETS.tiktok)).toBe(true);
    });
  });

  describe('Invalid inputs', () => {
    it('returns false when a value exceeds 50', () => {
      const safeZone: SafeZone = { top: 51, right: 5, bottom: 5, left: 5 };
      expect(isValidSafeZone(safeZone)).toBe(false);
    });

    it('returns false when a value is negative', () => {
      const safeZone: SafeZone = { top: -1, right: 5, bottom: 5, left: 5 };
      expect(isValidSafeZone(safeZone)).toBe(false);
    });

    it('returns false when top+bottom exceeds 100', () => {
      const safeZone: SafeZone = { top: 50, right: 5, bottom: 51, left: 5 };
      expect(isValidSafeZone(safeZone)).toBe(false);
    });

    it('returns false when left+right exceeds 100', () => {
      const safeZone: SafeZone = { top: 5, right: 60, bottom: 5, left: 50 };
      expect(isValidSafeZone(safeZone)).toBe(false);
    });

    it('returns false when right exceeds 50', () => {
      const safeZone: SafeZone = { top: 5, right: 55, bottom: 5, left: 5 };
      expect(isValidSafeZone(safeZone)).toBe(false);
    });

    it('returns false when bottom is negative', () => {
      const safeZone: SafeZone = { top: 5, right: 5, bottom: -5, left: 5 };
      expect(isValidSafeZone(safeZone)).toBe(false);
    });

    it('returns false when left is negative', () => {
      const safeZone: SafeZone = { top: 5, right: 5, bottom: 5, left: -10 };
      expect(isValidSafeZone(safeZone)).toBe(false);
    });
  });
});

describe('getSafeZonePreset', () => {
  it('returns correct preset for "default"', () => {
    const result = getSafeZonePreset('default');
    expect(result).toEqual({ top: 5, right: 5, bottom: 5, left: 5 });
  });

  it('returns correct preset for "reddit"', () => {
    const result = getSafeZonePreset('reddit');
    expect(result).toEqual({ top: 5, right: 5, bottom: 10, left: 5 });
  });

  it('returns correct preset for "meta_story"', () => {
    const result = getSafeZonePreset('meta_story');
    expect(result).toEqual({ top: 10, right: 5, bottom: 15, left: 5 });
  });

  it('returns correct preset for "meta_feed"', () => {
    const result = getSafeZonePreset('meta_feed');
    expect(result).toEqual({ top: 5, right: 5, bottom: 5, left: 5 });
  });

  it('returns correct preset for "tiktok"', () => {
    const result = getSafeZonePreset('tiktok');
    expect(result).toEqual({ top: 5, right: 5, bottom: 20, left: 5 });
  });

  it('returns correct preset for "youtube"', () => {
    const result = getSafeZonePreset('youtube');
    expect(result).toEqual({ top: 5, right: 5, bottom: 12, left: 5 });
  });

  it('returns a new object (not a reference to the original)', () => {
    const result1 = getSafeZonePreset('default');
    const result2 = getSafeZonePreset('default');

    expect(result1).toEqual(result2);
    expect(result1).not.toBe(result2);

    // Modifying one should not affect the other
    result1.top = 99;
    expect(result2.top).toBe(5);
  });
});
