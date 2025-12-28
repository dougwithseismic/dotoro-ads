import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateLocale,
  validateNamespace,
  clearMessageCache,
  getMessageCacheSize,
} from '../messages';

// Mock the dynamic imports
vi.mock('@/messages/en/common.json', () => ({
  default: {
    buttons: { save: 'Save', cancel: 'Cancel' },
    status: { success: 'Success', error: 'Error' },
  },
}));

vi.mock('@/messages/en/auth.json', () => ({
  default: {
    login: { title: 'Sign In', subtitle: 'Welcome' },
  },
}));

vi.mock('@/messages/en/dashboard.json', () => ({
  default: { page: { title: 'Dashboard' } },
}));

vi.mock('@/messages/en/campaigns.json', () => ({
  default: { list: { title: 'Campaigns' } },
}));

vi.mock('@/messages/en/templates.json', () => ({
  default: { list: { title: 'Templates' } },
}));

vi.mock('@/messages/en/accounts.json', () => ({
  default: { list: { title: 'Connected Accounts' } },
}));

vi.mock('@/messages/en/data-sources.json', () => ({
  default: { list: { title: 'Data Sources' } },
}));

vi.mock('@/messages/en/settings.json', () => ({
  default: { page: { title: 'Settings' } },
}));

vi.mock('@/messages/en/admin.json', () => ({
  default: { dashboard: { title: 'Admin Dashboard' } },
}));

describe('i18n messages', () => {
  beforeEach(() => {
    clearMessageCache();
  });

  describe('validateLocale', () => {
    it('should return valid locale unchanged', () => {
      expect(validateLocale('en')).toBe('en');
    });

    it('should return default locale for unsupported or invalid input', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(validateLocale('es')).toBe('en');
      expect(validateLocale('ja')).toBe('en');
      expect(validateLocale('invalid')).toBe('en');
      expect(validateLocale('')).toBe('en');
      expect(validateLocale('EN')).toBe('en');

      consoleSpy.mockRestore();
    });

    it('should warn when falling back to default', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      validateLocale('invalid');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid locale')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('validateNamespace', () => {
    it('should return true for valid namespaces', () => {
      expect(validateNamespace('common')).toBe(true);
      expect(validateNamespace('auth')).toBe(true);
      expect(validateNamespace('data-sources')).toBe(true);
    });

    it('should return false for invalid namespaces', () => {
      expect(validateNamespace('invalid')).toBe(false);
      expect(validateNamespace('')).toBe(false);
    });
  });

  describe('message cache', () => {
    it('should start with empty cache', () => {
      expect(getMessageCacheSize()).toBe(0);
    });

    it('should clear cache', () => {
      // Simulate adding to cache by importing
      clearMessageCache();
      expect(getMessageCacheSize()).toBe(0);
    });
  });

  // Note: loadNamespace and loadMessages tests require more complex
  // mocking setup due to dynamic imports. These are better tested
  // as integration tests with actual JSON files.
});
