// src/scrapers/gamersky.ts
import * as cheerio from 'cheerio';
import { BaseScraper, ScraperResult } from './base';
import { ScrapedQuest, QuestType, ScrapedStep } from '../models';

export class GamerskyScraper extends BaseScraper {
  get name(): string {
    return 'gamersky';
  }

  get baseUrl(): string {
    return 'https://www.gamersky.com';
  }

  private guideUrls = [
    'https://www.gamersky.com/handbook/202308/1389.shtml',
  ];

  async scrape(): Promise<ScraperResult> {
    const quests: ScrapedQuest[] = [];
    const errors: string[] = [];

    for (const url of this.guideUrls) {
      try {
        const $ = await this.fetchPage(url);
        const pageQuests = this.parseGuidePage($);
        quests.push(...pageQuests);
      } catch (error) {
        errors.push(`Failed to scrape ${url}: ${error}`);
      }
    }

    return {
      source: this.name,
      quests,
      timestamp: new Date().toISOString(),
      errors
    };
  }

  private parseGuidePage($: cheerio.CheerioAPI): ScrapedQuest[] {
    const quests: ScrapedQuest[] = [];

    $('.glMain').each((_, element) => {
      const title = this.cleanText($(element).find('h2').text());
      const paragraphs = $(element).find('p');

      if (title) {
        const steps = this.parseStepsFromParagraphs($, paragraphs);
        const type = this.detectQuestType(title);

        quests.push({
          name: title,
          type,
          description: '',
          chapter_name: this.detectChapter(title),
          steps
        });
      }
    });

    return quests;
  }

  private parseStepsFromParagraphs($: cheerio.CheerioAPI, paragraphs: cheerio.Cheerio<any>): ScrapedStep[] {
    const steps: ScrapedStep[] = [];

    paragraphs.each((index: number, _: any) => {
      const text = this.cleanText($(paragraphs[index]).text());
      if (text.length > 10) {
        steps.push({ description: text });
      }
    });

    return steps;
  }

  private detectQuestType(title: string): QuestType {
    if (title.includes('支线')) return QuestType.Side;
    if (title.includes('同伴') || title.includes('伙伴')) return QuestType.Companion;
    return QuestType.Main;
  }

  private detectChapter(title: string): string {
    if (title.includes('鹦鹉螺') || title.includes('海滩')) return '第一章';
    if (title.includes('德鲁伊') || title.includes('林地')) return '第一章';
    if (title.includes('月出') || title.includes('塔')) return '第二章';
    if (title.includes('博德') || title.includes('之门')) return '第三章';
    return '第一章';
  }
}