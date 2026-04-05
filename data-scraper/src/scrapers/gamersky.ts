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
    'https://www.gamersky.com/handbook/202308/1628448.shtml', // 全流程图文攻略
    'https://www.gamersky.com/handbook/202308/1635334.shtml', // 全支线及伙伴任务攻略
  ];

  async scrape(): Promise<ScraperResult> {
    const quests: ScrapedQuest[] = [];
    const errors: string[] = [];

    for (const url of this.guideUrls) {
      try {
        const pages = await this.fetchAllPages(url);
        const quest = this.parsePagesToQuest(pages, url);
        if (quest) {
          quests.push(quest);
        }
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

  private async fetchAllPages(startUrl: string): Promise<cheerio.CheerioAPI[]> {
    const pages: cheerio.CheerioAPI[] = [];
    const $ = await this.fetchPage(startUrl);
    pages.push($);

    // 获取分页链接
    const pageLinks = $('.page_css a')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter((href): href is string => !!href && href !== startUrl);

    // 去重并获取所有页面
    const uniqueLinks = [...new Set(pageLinks)];
    for (const link of uniqueLinks.slice(0, 10)) { // 限制前10页
      try {
        const page$ = await this.fetchPage(link);
        pages.push(page$);
      } catch {
        // 跳过失败的页面
      }
    }

    return pages;
  }

  private parsePagesToQuest(pages: cheerio.CheerioAPI[], url: string): ScrapedQuest | null {
    const steps: ScrapedStep[] = [];
    let questTitle = '博德之门3流程攻略';

    for (const $ of pages) {
      // 获取页面标题
      const title = $('title').text();
      if (title && title.includes('攻略')) {
        questTitle = title.split('_')[0].replace('《博德之门3》', '').trim();
      }

      // 解析段落内容
      $('.Mid2L_con p').each((_, el) => {
        const text = this.cleanText($(el).text());
        if (text.length > 30) {
          steps.push({ description: text });
        }
      });
    }

    if (steps.length === 0) {
      return null;
    }

    // 根据 URL 判断任务类型
    let type = QuestType.Main;
    if (url.includes('1635334')) {
      type = QuestType.Side; // 支线及伙伴任务
    }

    return {
      name: questTitle,
      type,
      description: `来自游民星空的攻略，共 ${pages.length} 页`,
      chapter_name: '综合',
      steps
    };
  }

  private detectQuestType(title: string): QuestType {
    if (title.includes('支线')) return QuestType.Side;
    if (title.includes('同伴') || title.includes('伙伴')) return QuestType.Companion;
    return QuestType.Main;
  }
}