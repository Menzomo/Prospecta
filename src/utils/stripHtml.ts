/**
 * Removes HTML, Gmail quote blocks, and quoted reply text from email bodies.
 * Handles both HTML-level and plain-text-level quoted content.
 */
export function stripHtml(html: string): string {
  return html
    // Remove style and script blocks entirely
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Remove Gmail quote attribution line: <div class="gmail_attr">...</div>
    .replace(/<div[^>]*class="[^"]*gmail_attr[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    // Remove Gmail blockquote (quoted original email body)
    .replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '')
    // Replace block-level closing tags with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    // Text-level fallback: remove quoted reply block ("Em ... escreveu:" / "On ... wrote:")
    // and everything that follows — covers plain-text emails and missed HTML patterns
    .replace(/(\n|^)(Em [^\n]+escreveu:|On [^\n]+wrote:)[\s\S]*/i, '')
    // Remove signature separator (-- followed by newline)
    .replace(/\n--\s*\n[\s\S]*/g, '')
    // Normalize whitespace
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Single-line plain text preview, suitable for inbox list. */
export function stripHtmlPreview(html: string, maxLength = 120): string {
  return stripHtml(html).replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, maxLength)
}
