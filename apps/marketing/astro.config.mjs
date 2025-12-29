import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';
import tailwindcss from '@tailwindcss/vite';

// OpenAPI spec URL - use production URL for builds, can override with env var
// Falls back to stub schema for local development
const openApiSpecUrl = process.env.OPENAPI_SPEC_URL
  || './public/openapi-stub.json';

export default defineConfig({
  site: 'https://dotoro.io',
  integrations: [
    starlight({
      title: 'Dotoro Documentation',
      description: 'Documentation for Dotoro - Campaign Management Platform',
      // Use root locale for English (no /en/ prefix for default language)
      defaultLocale: 'root',
      locales: {
        root: {
          label: 'English',
          lang: 'en',
        },
        es: { label: 'Espanol', lang: 'es' },
        fr: { label: 'Francais', lang: 'fr' },
        de: { label: 'Deutsch', lang: 'de' },
        ja: { label: 'Japanese', lang: 'ja' },
      },
      plugins: [
        // OpenAPI documentation plugin
        starlightOpenAPI([
          {
            base: 'docs/api',
            label: 'API Reference',
            schema: openApiSpecUrl,
          },
        ]),
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'docs' },
            { label: 'Quick Start', slug: 'docs/getting-started' },
          ],
        },
        {
          label: 'Core Concepts',
          collapsed: false,
          items: [
            { label: 'Data Sources', slug: 'docs/concepts/data-sources' },
            { label: 'Templates', slug: 'docs/concepts/templates' },
            { label: 'Rules', slug: 'docs/concepts/rules' },
            { label: 'Campaign Sets', slug: 'docs/concepts/campaign-sets' },
            { label: 'Transforms', slug: 'docs/concepts/transforms' },
          ],
        },
        {
          label: 'Platform Guides',
          collapsed: false,
          items: [
            {
              label: 'Reddit Ads',
              items: [
                { label: 'Overview', slug: 'docs/platforms/reddit/overview' },
                { label: 'Connection Guide', slug: 'docs/platforms/reddit/connection' },
              ],
            },
            { label: 'Google Ads', slug: 'docs/platforms/google/overview' },
            { label: 'Meta Ads', slug: 'docs/platforms/meta/overview' },
          ],
        },
        {
          label: 'Tutorials',
          collapsed: true,
          items: [
            { label: 'Product Feed Campaign', slug: 'docs/tutorials/product-feed-campaign' },
            { label: 'Automated Updates', slug: 'docs/tutorials/automated-updates' },
            { label: 'Multi-Platform Strategy', slug: 'docs/tutorials/multi-platform' },
          ],
        },
        {
          label: 'API Documentation',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'docs/api/overview' },
            { label: 'Authentication', slug: 'docs/api/authentication' },
            { label: 'Error Codes', slug: 'docs/api/errors' },
          ],
        },
        // Auto-generated OpenAPI sidebar groups
        ...openAPISidebarGroups,
      ],
      // Disable default 404 to avoid conflicts with marketing site
      disable404Route: true,
      // Custom CSS: Dotoro design system theming + OpenAPI overrides
      customCss: [
        './src/styles/starlight-custom.css',
        './src/styles/openapi-overrides.css',
      ],
      // Custom head elements for Google Fonts (Instrument Sans + Space Grotesk)
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.googleapis.com',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossorigin: true,
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap',
          },
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
