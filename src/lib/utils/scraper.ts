/**
 * URL content scraping utilities
 * Used for extracting text samples for tone analysis
 * Ported from: /mnt/c/Projects/yts/pages/Settings.py
 */

/**
 * Scrape text content from a URL
 * Uses fetch with proper headers to avoid blocking
 */
export async function scrapeUrlContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    return extractTextFromHtml(html)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to scrape URL: ${error.message}`)
    }
    throw new Error('Failed to scrape URL: Unknown error')
  }
}

/**
 * Extract readable text content from HTML
 * Removes scripts, styles, and HTML tags
 */
export function extractTextFromHtml(html: string): string {
  // Remove script tags and their content
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')

  // Remove style tags and their content
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, ' ')

  // Remove navigation, header, footer elements (common non-content areas)
  text = text.replace(/<(nav|header|footer|aside|menu)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')

  // Try to extract main content areas first
  const mainContentPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<main[^>]*>([\s\S]*?)<\/main>/gi,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  ]

  let mainContent = ''
  for (const pattern of mainContentPatterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      mainContent += match[1] + ' '
    }
  }

  // If we found main content, use that; otherwise use full text
  const contentToProcess = mainContent.length > 200 ? mainContent : text

  // Remove all remaining HTML tags
  let cleanText = contentToProcess.replace(/<[^>]+>/g, ' ')

  // Decode HTML entities
  cleanText = decodeHtmlEntities(cleanText)

  // Normalize whitespace
  cleanText = cleanText
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()

  // Limit to first 15000 characters (as in original Python code)
  return cleanText.substring(0, 15000)
}

/**
 * Decode common HTML entities
 */
export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&ndash;': '–',
    '&mdash;': '—',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&ldquo;': '\u201c',
    '&rdquo;': '\u201d',
    '&hellip;': '…',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
  }

  let result = text
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char)
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))

  return result
}

/**
 * Extract video title from YouTube page HTML
 * Fallback method when API doesn't provide title
 */
export async function fetchVideoTitle(videoId: string): Promise<string> {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return videoId // Return video ID as fallback
    }

    const html = await response.text()

    // Try to extract title from <title> tag
    const titleMatch = html.match(/<title>(.+?)<\/title>/i)
    if (titleMatch && titleMatch[1]) {
      // Remove " - YouTube" suffix
      let title = titleMatch[1].replace(/ - YouTube$/i, '').trim()
      title = decodeHtmlEntities(title)
      return title || videoId
    }

    // Try og:title meta tag
    const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
    if (ogTitleMatch && ogTitleMatch[1]) {
      return decodeHtmlEntities(ogTitleMatch[1])
    }

    return videoId
  } catch {
    return videoId
  }
}

/**
 * Validate that a URL is accessible
 */
export async function validateUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    return false
  }
}
