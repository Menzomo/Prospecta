const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

// Email prefixes that are never real business contacts
const NOISE_PREFIXES = ['noreply', 'no-reply', 'mailer-daemon', 'postmaster', 'root', 'webmaster', 'wordpress', 'suporte-noreply']

// Domains that appear in HTML but are not real emails
const NOISE_DOMAIN_FRAGMENTS = ['sentry.io', 'example.com', 'test.com', 'placeholder', 'yoursite', 'domain.com', 'email.com', 'acme.com', 'foo.bar', 'wixpress.com', 'squarespace.com']

function isNoiseEmail(email: string): boolean {
  const lower = email.toLowerCase()
  const atIdx = lower.indexOf('@')
  if (atIdx === -1) return true

  const local = lower.slice(0, atIdx)
  const domain = lower.slice(atIdx + 1)

  if (NOISE_PREFIXES.includes(local)) return true
  if (NOISE_DOMAIN_FRAGMENTS.some((f) => domain.includes(f))) return true

  // Filter file extensions masquerading as emails (e.g. style@2x.png)
  if (/\.(png|jpg|gif|svg|css|js|woff|ttf|eot|ico)$/.test(domain)) return true

  return false
}

function extractEmailsFromHtml(html: string): string[] {
  // mailto: links are most reliable
  const mailtoEmails: string[] = []
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g
  let m: RegExpExecArray | null
  while ((m = mailtoRegex.exec(html)) !== null) {
    mailtoEmails.push(m[1].toLowerCase())
  }

  // Fall back to text regex
  const textEmails: string[] = []
  const textRegex = new RegExp(EMAIL_REGEX.source, 'g')
  while ((m = textRegex.exec(html)) !== null) {
    textEmails.push(m[0].toLowerCase())
  }

  const all = [...new Set([...mailtoEmails, ...textEmails])]
  return all.filter((e) => !isNoiseEmail(e))
}

async function fetchHtml(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })
    if (!res.ok) return null
    const text = await res.text()
    // Limit to 100 KB to avoid parsing huge pages
    return text.slice(0, 100_000)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function extractEmailFromWebsite(websiteUrl: string): Promise<string | null> {
  let origin: string
  try {
    const parsed = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`)
    origin = parsed.origin
  } catch {
    return null
  }

  // Try homepage first
  const homepage = await fetchHtml(origin, 3000)
  if (homepage) {
    const emails = extractEmailsFromHtml(homepage)
    if (emails.length > 0) return emails[0]
  }

  // Try contact pages in parallel
  const contactPaths = ['/contato', '/contact', '/fale-conosco']
  const contactResults = await Promise.all(
    contactPaths.map((path) => fetchHtml(`${origin}${path}`, 2000))
  )

  for (const html of contactResults) {
    if (html) {
      const emails = extractEmailsFromHtml(html)
      if (emails.length > 0) return emails[0]
    }
  }

  return null
}
