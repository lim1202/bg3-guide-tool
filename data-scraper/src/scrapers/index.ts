// src/scrapers/index.ts
import { BaseScraper } from './base';
import { ThreeDMScraper } from './3dm';
import { GamerskyScraper } from './gamersky';

export const scrapers: Map<string, BaseScraper> = new Map<string, BaseScraper>([
  ['3dm', new ThreeDMScraper()],
  ['gamersky', new GamerskyScraper()],
]);

export function getScraper(name: string): BaseScraper | undefined {
  return scrapers.get(name);
}

export function getAllScrapers(): BaseScraper[] {
  return Array.from(scrapers.values());
}

export { BaseScraper, ScraperResult } from './base';
export { ThreeDMScraper } from './3dm';
export { GamerskyScraper } from './gamersky';