/**
 * LocaleTest Component Tests
 *
 * Tests for the i18n verification component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleTest } from "../LocaleTest";

// Mock next-intl hooks
vi.mock("next-intl", () => ({
  useLocale: vi.fn(),
  useTranslations: vi.fn(),
}));

import { useLocale, useTranslations } from "next-intl";

describe("LocaleTest component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display the current locale", () => {
    vi.mocked(useLocale).mockReturnValue("en");
    vi.mocked(useTranslations).mockReturnValue(
      ((key: string) => `translated:${key}`) as ReturnType<typeof useTranslations>
    );

    render(<LocaleTest />);

    expect(screen.getByTestId("current-locale")).toHaveTextContent("en");
  });

  it("should display translated text", () => {
    vi.mocked(useLocale).mockReturnValue("en");
    vi.mocked(useTranslations).mockReturnValue(
      ((key: string) => key === "buttons.save" ? "Save" : key) as ReturnType<typeof useTranslations>
    );

    render(<LocaleTest />);

    expect(screen.getByTestId("translated-text")).toHaveTextContent("Save");
  });

  it("should render English as the only locale option", () => {
    vi.mocked(useLocale).mockReturnValue("en");
    vi.mocked(useTranslations).mockReturnValue(
      ((key: string) => `translated:${key}`) as ReturnType<typeof useTranslations>
    );

    render(<LocaleTest />);

    const localeOptions = screen.getByTestId("locale-options");
    expect(localeOptions).toHaveTextContent("en");
    // Other locales should not be present
    expect(localeOptions).not.toHaveTextContent("es");
    expect(localeOptions).not.toHaveTextContent("fr");
    expect(localeOptions).not.toHaveTextContent("de");
    expect(localeOptions).not.toHaveTextContent("ja");
  });

  it("should highlight the active locale", () => {
    vi.mocked(useLocale).mockReturnValue("en");
    vi.mocked(useTranslations).mockReturnValue(
      ((key: string) => `translated:${key}`) as ReturnType<typeof useTranslations>
    );

    render(<LocaleTest />);

    const activeLocale = screen.getByTestId("locale-en");
    expect(activeLocale).toHaveAttribute("data-active", "true");
  });
});
