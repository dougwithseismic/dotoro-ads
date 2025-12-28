/**
 * Translation System Types
 *
 * Provides type-safe access to all translation keys across the application.
 * Types are derived from the English locale JSON files as the source of truth.
 */

// Import all English translations as source of truth for type generation
import type common from '@/messages/en/common.json';
import type auth from '@/messages/en/auth.json';
import type dashboard from '@/messages/en/dashboard.json';
import type campaigns from '@/messages/en/campaigns.json';
import type templates from '@/messages/en/templates.json';
import type accounts from '@/messages/en/accounts.json';
import type dataSources from '@/messages/en/data-sources.json';
import type settings from '@/messages/en/settings.json';
import type admin from '@/messages/en/admin.json';

/**
 * Namespace type definitions
 * Each namespace corresponds to a JSON file in the messages directory
 */
export type CommonMessages = typeof common;
export type AuthMessages = typeof auth;
export type DashboardMessages = typeof dashboard;
export type CampaignsMessages = typeof campaigns;
export type TemplatesMessages = typeof templates;
export type AccountsMessages = typeof accounts;
export type DataSourcesMessages = typeof dataSources;
export type SettingsMessages = typeof settings;
export type AdminMessages = typeof admin;

/**
 * Combined messages interface
 * Maps namespace keys to their message types
 */
export interface Messages {
  common: CommonMessages;
  auth: AuthMessages;
  dashboard: DashboardMessages;
  campaigns: CampaignsMessages;
  templates: TemplatesMessages;
  accounts: AccountsMessages;
  'data-sources': DataSourcesMessages;
  settings: SettingsMessages;
  admin: AdminMessages;
}

/**
 * Available namespace keys
 */
export type Namespace = keyof Messages;

/**
 * All supported locales
 * Currently English-only. Add more locales here when i18n expansion is needed.
 */
export type Locale = 'en';

/**
 * Array of all supported locales for iteration
 */
export const locales: readonly Locale[] = ['en'] as const;

/**
 * Default locale used as fallback
 */
export const defaultLocale: Locale = 'en';

/**
 * Array of all namespaces for iteration
 */
export const namespaces: readonly Namespace[] = [
  'common',
  'auth',
  'dashboard',
  'campaigns',
  'templates',
  'accounts',
  'data-sources',
  'settings',
  'admin',
] as const;

/**
 * Locale display names for UI rendering
 */
export const localeNames: Record<Locale, string> = {
  en: 'English',
} as const;

/**
 * Locale native names for UI rendering
 */
export const localeNativeNames: Record<Locale, string> = {
  en: 'English',
} as const;

/**
 * Type guard to check if a string is a valid locale
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Type guard to check if a string is a valid namespace
 */
export function isValidNamespace(namespace: string): namespace is Namespace {
  return namespaces.includes(namespace as Namespace);
}
