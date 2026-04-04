// __tests__/scrapers.test.ts
import { BaseScraper, ScraperResult } from '../src/scrapers/base';

describe('BaseScraper', () => {
  class TestScraper extends BaseScraper {
    get name(): string {
      return 'test';
    }
    get baseUrl(): string {
      return 'https://example.com';
    }
    async scrape(): Promise<ScraperResult> {
      return {
        source: this.name,
        quests: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  it('should have required properties', () => {
    const scraper = new TestScraper();
    expect(scraper.name).toBe('test');
    expect(scraper.baseUrl).toBe('https://example.com');
  });

  it('should return valid result structure', async () => {
    const scraper = new TestScraper();
    const result = await scraper.scrape();
    expect(result.source).toBe('test');
    expect(result.quests).toEqual([]);
    expect(result.timestamp).toBeDefined();
  });

  it('should have fetchPage method', () => {
    const scraper = new TestScraper();
    expect((scraper as any).fetchPage).toBeDefined();
  });
});