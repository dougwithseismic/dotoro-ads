import * as React from "react";
export interface BaseLayoutProps {
    /** Preview text shown in email clients */
    preview?: string;
    /** Email content */
    children: React.ReactNode;
}
/**
 * Base email layout component
 *
 * Provides a consistent wrapper for all email templates with:
 * - Responsive container (600px max-width)
 * - Brand header with logo placeholder
 * - Footer with unsubscribe/legal links
 * - Dark mode support
 */
export declare function BaseLayout({ preview, children }: BaseLayoutProps): import("react/jsx-runtime").JSX.Element;
export default BaseLayout;
//# sourceMappingURL=base-layout.d.ts.map