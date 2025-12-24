/**
 * Dashboard Académico - Simple Markdown Parser
 * Converts basic markdown syntax to HTML for the help modal
 */

/**
 * Generate a URL-friendly ID from text
 * @param {string} text - Text to convert to ID
 * @returns {string} URL-friendly ID
 */
function generateId(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Parse markdown to HTML
 * Supports: headers, bold, lists, links, blockquotes, horizontal rules
 * @param {string} markdown - Markdown text to parse
 * @returns {string} HTML string
 */
export function parseMarkdown(markdown) {
  if (!markdown) return '';

  let html = markdown;

  // Escape HTML entities first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Split by lines for line-by-line processing
  let lines = html.split('\n');
  let result = [];
  let inList = false;
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmedLine = line.trim();

    // Horizontal rules (---)
    if (trimmedLine === '---') {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (inBlockquote) {
        result.push('</blockquote>');
        inBlockquote = false;
      }
      result.push('<hr>');
      continue;
    }

    // Headers (###, ##, #)
    if (trimmedLine.startsWith('#')) {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (inBlockquote) {
        result.push('</blockquote>');
        inBlockquote = false;
      }

      const level = trimmedLine.match(/^#+/)[0].length;
      const text = trimmedLine.substring(level).trim();
      const id = generateId(text);
      result.push(`<h${level} id="${id}">${processInlineMarkdown(text)}</h${level}>`);
      continue;
    }

    // Blockquotes (>)
    if (trimmedLine.startsWith('&gt;')) {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (!inBlockquote) {
        result.push('<blockquote>');
        inBlockquote = true;
      }
      const text = trimmedLine.substring(4).trim();
      result.push(`<p>${processInlineMarkdown(text)}</p>`);
      continue;
    } else if (inBlockquote) {
      result.push('</blockquote>');
      inBlockquote = false;
    }

    // Lists (-)
    if (trimmedLine.startsWith('-')) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      const text = trimmedLine.substring(1).trim();
      result.push(`<li>${processInlineMarkdown(text)}</li>`);
      continue;
    } else if (inList && trimmedLine !== '') {
      result.push('</ul>');
      inList = false;
    }

    // Numbered lists (1., 2., etc.)
    if (/^\d+\./.test(trimmedLine)) {
      if (inList !== 'ol') {
        if (inList === true) result.push('</ul>');
        result.push('<ol>');
        inList = 'ol';
      }
      const text = trimmedLine.replace(/^\d+\.\s*/, '');
      result.push(`<li>${processInlineMarkdown(text)}</li>`);
      continue;
    } else if (inList === 'ol' && trimmedLine !== '') {
      result.push('</ol>');
      inList = false;
    }

    // Empty lines
    if (trimmedLine === '') {
      if (inList === true) {
        result.push('</ul>');
        inList = false;
      } else if (inList === 'ol') {
        result.push('</ol>');
        inList = false;
      }
      result.push('<br>');
      continue;
    }

    // Regular paragraphs
    if (!inList && !inBlockquote) {
      result.push(`<p>${processInlineMarkdown(line)}</p>`);
    }
  }

  // Close any open lists or blockquotes
  if (inList === true) result.push('</ul>');
  if (inList === 'ol') result.push('</ol>');
  if (inBlockquote) result.push('</blockquote>');

  return result.join('\n');
}

/**
 * Process inline markdown (bold, links)
 * @param {string} text - Text to process
 * @returns {string} Processed text with HTML tags
 */
function processInlineMarkdown(text) {
  let processed = text;

  // Links [text](url)
  processed = processed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Bold **text**
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Code `text`
  processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');

  return processed;
}

/**
 * Extract language-specific section from bilingual README
 * @param {string} content - Full README content
 * @param {string} language - 'es' or 'va'
 * @returns {string} Language-specific markdown content
 */
export function extractLanguageSection(content, language) {
  if (!content) return '';

  const languageMarker = language === 'es' ? '## [ES] ESPAÑOL' : '## [VA] VALENCIÀ';
  const otherLanguageMarker = language === 'es' ? '## [VA] VALENCIÀ' : '## [ES] ESPAÑOL';

  // Find the start of the desired language section
  const startIndex = content.indexOf(languageMarker);
  if (startIndex === -1) return content; // Fallback: return all content

  // Find the start of the other language section (end boundary)
  const endIndex = content.indexOf(otherLanguageMarker, startIndex);

  // Extract the section
  if (endIndex === -1) {
    // If other language section not found, take from start to end
    return content.substring(startIndex);
  } else {
    // Extract between the two markers
    return content.substring(startIndex, endIndex);
  }
}

/**
 * Extract table of contents from markdown
 * @param {string} markdown - Markdown text to parse
 * @returns {Array<{level: number, text: string, id: string}>} TOC entries
 */
export function extractTableOfContents(markdown) {
  if (!markdown) return [];

  const lines = markdown.split('\n');
  const toc = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Only process headers (###, ##, #)
    if (trimmedLine.startsWith('#')) {
      const level = trimmedLine.match(/^#+/)[0].length;

      // Skip h1 (main title) and only include h2, h3, h4
      if (level >= 2 && level <= 4) {
        const text = trimmedLine.substring(level).trim();
        // Remove markdown formatting from text
        const cleanText = text
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

        const id = generateId(text);
        toc.push({ level, text: cleanText, id });
      }
    }
  }

  return toc;
}
