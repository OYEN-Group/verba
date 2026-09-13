import * as cheerio from 'cheerio';
const pdfParse = require('pdf-parse');
import { NormalizedSource } from '../../sources/types';
import { classifyEvidenceAvailability } from '../../citations/evidence';

export type FetchedContent = {
  text: string;
  sourceUrl: string | null;
  method: 'abstract' | 'html' | 'pdf' | 'user_doc';
};

function isSafeUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const hostname = url.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') return false;
    if (/^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^169\.254\./.test(hostname)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempts to retrieve readable text from a source.
 * Prioritizes Open Access full text (HTML/PDF) over abstracts.
 */
export async function fetchAccessibleContent(
  source: NormalizedSource,
  userDocText?: string
): Promise<FetchedContent | null> {
  const availability = classifyEvidenceAvailability(source, !!userDocText);

  // 1. User document
  if (userDocText) {
    return {
      text: userDocText,
      sourceUrl: null,
      method: 'user_doc',
    };
  }

  // 2. Open Access Full Text
  if (availability.oaUrl && isSafeUrl(availability.oaUrl)) {
    try {
      const res = await fetch(availability.oaUrl, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'Verba Academic Bot (compatible; MSIE 6.0; Windows NT 5.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.8,*/*;q=0.7',
        }
      });
      
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        const contentLength = res.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > 15 * 1024 * 1024) {
          throw new Error('Response too large');
        }
        
        // Strict Content-Type evaluation (ignore URL extension which can lie)
        if (contentType.includes('application/pdf')) {
          const buffer = await res.arrayBuffer();
          if (buffer.byteLength > 15 * 1024 * 1024) throw new Error('PDF too large');

          const pdfData = await pdfParse(Buffer.from(buffer));
          if (pdfData.text && pdfData.text.trim().length > 100) {
            return {
              text: pdfData.text,
              sourceUrl: availability.oaUrl,
              method: 'pdf',
            };
          }
        } else if (contentType.includes('text/html') || contentType.includes('application/xml')) {
          const html = await res.text();
          const $ = cheerio.load(html);
          
          // Clean up non-content tags
          $('script, style, nav, header, footer, aside, noscript, svg, button, form, iframe').remove();
          
          // Aggressively strip References/Bibliography to avoid lexical traps
          $('h1, h2, h3, h4, h5, h6').each((_, el) => {
            const text = $(el).text().toLowerCase().trim();
            if (text === 'references' || text === 'bibliography' || text === 'works cited' || text === 'literature cited') {
              $(el).nextAll().remove();
              $(el).remove();
            }
          });
          
          let text = $('body').text();
          if (!text || text.trim().length < 100) {
             text = $.text();
          }
          
          text = text.replace(/\s+/g, ' ').trim();
          
          if (text.length > 100) {
            return {
              text,
              sourceUrl: availability.oaUrl,
              method: 'html',
            };
          }
        }
      }
    } catch (err) {
      console.warn(`[fetcher] Failed to retrieve full text from ${availability.oaUrl}:`, err);
    }
  }

  // 3. Abstract Fallback
  if (source.abstract) {
    return {
      text: source.abstract,
      sourceUrl: null,
      method: 'abstract',
    };
  }

  return null;
}
