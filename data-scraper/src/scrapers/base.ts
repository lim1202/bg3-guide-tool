// src/scrapers/base.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedQuest } from '../models';

export interface ScraperResult {
  source: string;
  quests: ScrapedQuest[];
  timestamp: string;
  errors?: string[];
}

export abstract class BaseScraper {
  abstract get name(): string;
  abstract get baseUrl(): string;
  abstract scrape(): Promise<ScraperResult>;

  protected async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });
    return cheerio.load(response.data);
  }

  protected async fetchPages(urls: string[]): Promise<cheerio.CheerioAPI[]> {
    const results = await Promise.all(urls.map(url => this.fetchPage(url)));
    return results;
  }

  protected cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }
}