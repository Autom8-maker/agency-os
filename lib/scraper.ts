import type { ScrapedAd, ScrapeResult } from '@/types';

const AD_LIBRARY_BASE = 'https://www.facebook.com/ads/library/';
const MAX_ADS = 25;
const SCROLL_DELAY = 1500;
const PAGE_LOAD_TIMEOUT = 15000;

export async function scrapeMetaAdLibrary(query: string): Promise<ScrapeResult> {
  let browser: import('puppeteer').Browser | null = null;

  try {
    // Dynamic import to avoid issues in non-server environments
    const puppeteer = await import('puppeteer');

    browser = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Block unnecessary resources to speed up scraping
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    const url = `${AD_LIBRARY_BASE}?active_status=all&ad_type=all&country=US&q=${encodeURIComponent(query)}&search_type=keyword_unordered`;

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // Wait for ad results to load
    try {
      await page.waitForSelector('[data-testid="ad_library_search_results"]', {
        timeout: 8000,
      });
    } catch {
      // Selector may differ — proceed anyway and try to extract what we can
    }

    // Scroll to load more ads
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 2);
      });
      await new Promise((resolve) => setTimeout(resolve, SCROLL_DELAY));
    }

    // Extract ad data from the page
    const ads = await page.evaluate((maxAds: number) => {
      const results: Array<{
        advertiser: string;
        body: string;
        hook: string;
        cta: string;
        offer: string;
        link: string;
        raw: string;
      }> = [];

      // Try multiple selector strategies since Meta updates their markup frequently
      const adContainers = document.querySelectorAll(
        '[class*="x1lliihq"]:has([class*="pageName"]), ' +
          'div[class*="_7jyr"], ' +
          'div[class*="adCard"], ' +
          'div[data-testid*="ad_library"]'
      );

      // Fallback: look for any div with substantial text content that looks like an ad
      const allDivs = document.querySelectorAll('div');
      const adLikeDivs: Element[] = [];

      allDivs.forEach((div) => {
        const text = div.innerText || '';
        const hasAdIndicator =
          text.includes('Sponsored') ||
          text.includes('Learn More') ||
          text.includes('Shop Now') ||
          text.includes('Sign Up') ||
          text.includes('Get Offer');
        const hasSubstantialText = text.length > 100 && text.length < 2000;
        const isLeafLike = div.children.length < 8;

        if (hasAdIndicator && hasSubstantialText && isLeafLike) {
          adLikeDivs.push(div);
        }
      });

      const targets = adContainers.length > 0 ? Array.from(adContainers) : adLikeDivs;

      for (const container of targets.slice(0, maxAds)) {
        const raw = (container as HTMLElement).innerText || '';
        if (!raw || raw.length < 50) continue;

        const lines = raw
          .split('\n')
          .map((l: string) => l.trim())
          .filter(Boolean);

        // Extract advertiser (usually first line or page name)
        const advertiser = lines[0] || 'Unknown Advertiser';

        // Extract body (longest text block, skipping first line)
        const bodyLines = lines.slice(1).filter((l: string) => l.length > 30);
        const body = bodyLines.slice(0, 3).join(' ');

        // Extract hook (first meaningful sentence)
        const hook = body.split(/[.!?]/)[0]?.trim() || '';

        // Extract CTA (common call-to-action phrases)
        const ctaPatterns = [
          'Learn More',
          'Shop Now',
          'Sign Up',
          'Get Started',
          'Book Now',
          'Download',
          'Get Offer',
          'Subscribe',
          'Apply Now',
          'Contact Us',
          'Watch More',
          'Get Quote',
        ];
        const cta =
          lines.find((l: string) =>
            ctaPatterns.some((p) => l.toLowerCase().includes(p.toLowerCase()))
          ) || '';

        // Extract offer (lines mentioning price, discount, or deal)
        const offerPatterns = ['%', 'off', 'free', 'save', '$', 'deal', 'discount', 'trial'];
        const offer =
          lines.find((l: string) =>
            offerPatterns.some((p) => l.toLowerCase().includes(p))
          ) || '';

        // Extract link
        const linkEl = container.querySelector('a[href*="http"]') as HTMLAnchorElement | null;
        const link = linkEl?.href || '';

        if (body || hook) {
          results.push({ advertiser, body, hook, cta, offer, link, raw });
        }
      }

      return results;
    }, MAX_ADS);

    return { ads: ads as ScrapedAd[] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown scraping error';
    console.error('[Scraper] Error:', message);
    return {
      ads: [],
      error: `Scraper encountered an issue: ${message}. Meta Ad Library may have changed its layout or requires authentication.`,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Parse raw ad text into structured fields.
 * Used as a fallback when Puppeteer extraction is imprecise.
 */
export function parseAdText(raw: string): Omit<ScrapedAd, 'advertiser' | 'link'> {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const body = lines.filter((l) => l.length > 40).slice(0, 3).join(' ');
  const hook = body.split(/[.!?]/)[0]?.trim() || '';

  const ctaKeywords = ['learn more', 'shop now', 'sign up', 'get started', 'book now', 'download'];
  const cta = lines.find((l) => ctaKeywords.some((k) => l.toLowerCase().includes(k))) || '';

  const offerKeywords = ['%', 'off', 'free', 'save', '$', 'deal', 'discount'];
  const offer = lines.find((l) => offerKeywords.some((k) => l.toLowerCase().includes(k))) || '';

  return { body, hook, cta, offer, raw };
}
