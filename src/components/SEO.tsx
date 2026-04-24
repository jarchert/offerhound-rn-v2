import React from "react";

/**
 * RN PORT NOTE (parity gap, intentional):
 * -------------------------------------------------------------------
 * The web version of this component (src/components/SEO.tsx in the
 * Lovable repo) uses `react-helmet-async` + a `useSEO` hook to inject
 * <title>, <meta>, canonical <link>, JSON-LD <script>, and robots tags
 * into the document <head>.
 *
 * React Native has NO DOM and NO <head>. Search engines do not crawl
 * native app screens, so SEO meta tags are not applicable here.
 *
 * To preserve API surface (so call sites don't need changes), this
 * file ports SEO / ArticleSEO / ProfileSEO / ProductSEO as no-op
 * wrappers: they accept the same props and simply render `children`
 * (or `null` when no children are passed).
 *
 * If/when this app gains deep-linking metadata, App Store/Play Store
 * surface previews, or a server-rendered web companion, revisit this
 * file and wire the relevant props through (e.g. expo-router's <Head>
 * for the web target, or Branch/Firebase Dynamic Links for sharing
 * previews).
 * -------------------------------------------------------------------
 */

export interface SEOProps {
  /** Page title - will be shown in browser tab (web only; no-op on RN) */
  title: string;
  /** Meta description for search engines (web only; no-op on RN) */
  description: string;
  /** Comma-separated keywords for SEO (web only; no-op on RN) */
  keywords?: string;
  /** Canonical URL for this page (web only; no-op on RN) */
  canonicalUrl?: string;
  /** Open Graph title (defaults to title) */
  ogTitle?: string;
  /** Open Graph description (defaults to description) */
  ogDescription?: string;
  /** Open Graph image URL (should be absolute URL) */
  ogImage?: string;
  /** Open Graph type (website, article, profile, etc.) */
  ogType?: "website" | "article" | "profile" | "product";
  /** Open Graph URL (defaults to canonicalUrl) */
  ogUrl?: string;
  /** Twitter card type */
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  /** Twitter title (defaults to ogTitle or title) */
  twitterTitle?: string;
  /** Twitter description (defaults to ogDescription or description) */
  twitterDescription?: string;
  /** Twitter image URL (defaults to ogImage) */
  twitterImage?: string;
  /** Twitter @username for the site */
  twitterSite?: string;
  /** JSON-LD structured data object */
  structuredData?: object;
  /** Whether to prevent indexing (adds noindex meta) */
  noIndex?: boolean;
  /** Whether to prevent following links (adds nofollow meta) */
  noFollow?: boolean;
  /** Children to render (optional - component can be self-closing) */
  children?: React.ReactNode;
}

/**
 * SEO Component - Declarative SEO management for pages.
 *
 * RN: no-op. Renders `children` if provided, otherwise null.
 * All meta/og/twitter/structured-data props are accepted for API
 * parity with the web component and intentionally ignored.
 */
export function SEO({ children }: SEOProps) {
  return children ? <>{children}</> : null;
}

/**
 * Pre-configured SEO component for article/blog pages (RN no-op).
 */
export function ArticleSEO({
  children,
}: {
  title: string;
  description: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  image?: string;
  canonicalUrl?: string;
  children?: React.ReactNode;
}) {
  return children ? <>{children}</> : null;
}

/**
 * Pre-configured SEO component for profile pages (RN no-op).
 */
export function ProfileSEO({
  children,
}: {
  name: string;
  title: string;
  description: string;
  image?: string;
  canonicalUrl?: string;
  username?: string;
  children?: React.ReactNode;
}) {
  return children ? <>{children}</> : null;
}

/**
 * Pre-configured SEO component for product pages (RN no-op).
 */
export function ProductSEO({
  children,
}: {
  name: string;
  title: string;
  description: string;
  image?: string;
  price?: number;
  currency?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  canonicalUrl?: string;
  children?: React.ReactNode;
}) {
  return children ? <>{children}</> : null;
}

export default SEO;
