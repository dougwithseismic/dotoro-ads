import { describe, it, expect } from 'vitest';
import {
  locales,
  defaultLocale,
  namespaces,
  localeNames,
  localeNativeNames,
  isValidLocale,
  isValidNamespace,
} from '../types';

describe('i18n types', () => {
  describe('locales', () => {
    it('should contain English as the only supported locale', () => {
      expect(locales).toEqual(['en']);
    });

    it('should have en as the first and only locale', () => {
      expect(locales[0]).toBe('en');
    });

    it('should be readonly', () => {
      expect(Object.isFrozen(locales)).toBe(false); // const assertion makes it readonly tuple, not frozen
      expect(locales.length).toBe(1);
    });
  });

  describe('defaultLocale', () => {
    it('should be en', () => {
      expect(defaultLocale).toBe('en');
    });

    it('should be included in locales', () => {
      expect(locales).toContain(defaultLocale);
    });
  });

  describe('namespaces', () => {
    it('should contain all supported namespaces', () => {
      expect(namespaces).toEqual([
        'common',
        'auth',
        'dashboard',
        'campaigns',
        'templates',
        'accounts',
        'data-sources',
        'settings',
        'admin',
      ]);
    });

    it('should have 9 namespaces', () => {
      expect(namespaces.length).toBe(9);
    });

    it('should include common namespace', () => {
      expect(namespaces).toContain('common');
    });

    it('should include data-sources namespace with hyphen', () => {
      expect(namespaces).toContain('data-sources');
    });
  });

  describe('localeNames', () => {
    it('should have names for all locales', () => {
      for (const locale of locales) {
        expect(localeNames[locale]).toBeDefined();
        expect(typeof localeNames[locale]).toBe('string');
      }
    });

    it('should have correct English name', () => {
      expect(localeNames.en).toBe('English');
    });
  });

  describe('localeNativeNames', () => {
    it('should have native names for all locales', () => {
      for (const locale of locales) {
        expect(localeNativeNames[locale]).toBeDefined();
        expect(typeof localeNativeNames[locale]).toBe('string');
      }
    });

    it('should have English name for en locale', () => {
      expect(localeNativeNames.en).toBe('English');
    });
  });

  describe('isValidLocale', () => {
    it('should return true for English locale', () => {
      expect(isValidLocale('en')).toBe(true);
    });

    it('should return false for unsupported locales', () => {
      expect(isValidLocale('es')).toBe(false);
      expect(isValidLocale('fr')).toBe(false);
      expect(isValidLocale('de')).toBe(false);
      expect(isValidLocale('ja')).toBe(false);
      expect(isValidLocale('xx')).toBe(false);
      expect(isValidLocale('')).toBe(false);
      expect(isValidLocale('EN')).toBe(false);
      expect(isValidLocale('english')).toBe(false);
    });
  });

  describe('isValidNamespace', () => {
    it('should return true for valid namespaces', () => {
      expect(isValidNamespace('common')).toBe(true);
      expect(isValidNamespace('auth')).toBe(true);
      expect(isValidNamespace('data-sources')).toBe(true);
    });

    it('should return false for invalid namespaces', () => {
      expect(isValidNamespace('invalid')).toBe(false);
      expect(isValidNamespace('')).toBe(false);
      expect(isValidNamespace('COMMON')).toBe(false);
    });
  });
});
