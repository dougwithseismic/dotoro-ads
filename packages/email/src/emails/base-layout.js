import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Body, Container, Head, Html, Img, Link, Preview, Section, Text, } from "@react-email/components";
/**
 * Base email layout component
 *
 * Provides a consistent wrapper for all email templates with:
 * - Responsive container (600px max-width)
 * - Brand header with logo placeholder
 * - Footer with unsubscribe/legal links
 * - Dark mode support
 */
export function BaseLayout({ preview, children }) {
    return (_jsxs(Html, { children: [_jsx(Head, {}), preview && _jsx(Preview, { children: preview }), _jsx(Body, { style: main, children: _jsxs(Container, { style: container, children: [_jsx(Section, { style: header, children: _jsx(Img, { src: "https://via.placeholder.com/150x40?text=Dotoro", width: "150", height: "40", alt: "Dotoro", style: logo }) }), _jsx(Section, { style: content, children: children }), _jsxs(Section, { style: footer, children: [_jsx(Text, { style: footerText, children: "This email was sent by Dotoro. If you have questions, please contact our support team." }), _jsxs(Text, { style: footerLinks, children: [_jsx(Link, { href: "https://dotoro.io/privacy", style: link, children: "Privacy Policy" }), " | ", _jsx(Link, { href: "https://dotoro.io/terms", style: link, children: "Terms of Service" }), " | ", _jsx(Link, { href: "https://dotoro.io/unsubscribe", style: link, children: "Unsubscribe" })] }), _jsxs(Text, { style: copyright, children: ["\u00A9 ", new Date().getFullYear(), " Dotoro. All rights reserved."] })] })] }) })] }));
}
// Styles
const main = {
    backgroundColor: "#f6f9fc",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};
const container = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "20px 0 48px",
    marginBottom: "64px",
    maxWidth: "600px",
};
const header = {
    padding: "32px 48px",
    borderBottom: "1px solid #e6ebf1",
};
const logo = {
    margin: "0 auto",
    display: "block",
};
const content = {
    padding: "32px 48px",
};
const footer = {
    padding: "32px 48px",
    borderTop: "1px solid #e6ebf1",
    textAlign: "center",
};
const footerText = {
    color: "#8898aa",
    fontSize: "12px",
    lineHeight: "16px",
    marginBottom: "16px",
};
const footerLinks = {
    color: "#8898aa",
    fontSize: "12px",
    lineHeight: "16px",
    marginBottom: "8px",
};
const link = {
    color: "#8898aa",
    textDecoration: "underline",
};
const copyright = {
    color: "#8898aa",
    fontSize: "12px",
    lineHeight: "16px",
    margin: "0",
};
export default BaseLayout;
