// RN port stub of web sanitizeHtml.
// Web version (DOMPurify) can't run in RN; we don't render HTML natively either.
// We expose a minimal sanitizer that strips <script>/<style> and on* handlers.
// Used by AdminLegalContentTabs preview (plain-text preview in RN — see GAPS).
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  let out = String(input);
  // Remove script/style blocks
  out = out.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  // Remove inline event handlers (on*="...")
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  // Remove javascript: URIs
  out = out.replace(/javascript:/gi, '');
  return out;
}

// Strip all tags to produce plain text — used for RN preview fallback.
export function htmlToPlainText(input: string): string {
  if (!input) return '';
  return String(input)
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
