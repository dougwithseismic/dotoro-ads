import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider } from "@/lib/auth";
import { TeamProvider } from "@/lib/teams/context";
import { QueryProvider } from "@/lib/query-client";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { locales, type Locale } from "@/src/i18n/config";

/**
 * Generate static params for all supported locales.
 * Enables static generation for all locale variants.
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Localized Layout
 *
 * This layout wraps all pages under the [locale] segment.
 * It provides:
 * - NextIntlClientProvider for client-side translations
 * - Theme, Auth, and App layout providers
 * - Locale validation with 404 for invalid locales
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate the locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering for this locale
  setRequestLocale(locale);

  // Get messages for the current locale
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <QueryProvider>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <TeamProvider>
                <AppLayout>{children}</AppLayout>
              </TeamProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
