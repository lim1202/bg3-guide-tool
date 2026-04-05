// __tests__/scrapers.test.ts
import { BaseScraper, ScraperResult } from '../src/scrapers/base';
import { ThreeDMScraper } from '../src/scrapers/3dm';

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

describe('ThreeDMScraper', () => {
  it('should have correct name and url', () => {
    const scraper = new ThreeDMScraper();
    expect(scraper.name).toBe('3dm');
    expect(scraper.baseUrl).toContain('3dmgame');
  });

  // 注意：实际网络请求测试需要mock，这里只验证结构
  it('should implement scrape method', () => {
    const scraper = new ThreeDMScraper();
    expect(scraper.scrape).toBeDefined();
  });
});