// src/scrapers/3dm.ts
import * as cheerio from 'cheerio';
import { BaseScraper, ScraperResult } from './base';
import { ScrapedQuest, QuestType, ScrapedStep } from '../models';

export class ThreeDMScraper extends BaseScraper {
  get name(): string {
    return '3dm';
  }

  get baseUrl(): string {
    return 'https://www.3dmgame.com';
  }

  // BG3攻略专题页面URL（需要根据实际网站结构调整）
  private guideUrls = [
    'https://www.3dmgame.com/gl/3827_1.html', // 主线攻略示例URL
  ];

  async scrape(): Promise<ScraperResult> {
    const quests: ScrapedQuest[] = [];
    const errors: string[] = [];

    for (const url of this.guideUrls) {
      try {
        const $ = await this.fetchPage(url);
        const pageQuests = this.parseQuestPage($);
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

  private parseQuestPage($: cheerio.CheerioAPI): ScrapedQuest[] {
    const quests: ScrapedQuest[] = [];

    // 解析攻略页面结构（需根据3DM实际HTML结构调整选择器）
    // 以下是示例逻辑，实际需要查看网站HTML

    $('.gl_box').each((_, element) => {
      const title = this.cleanText($(element).find('.title').text());
      const content = $(element).find('.content').html() || '';

      if (title && content) {
        const quest = this.parseQuestContent(title, content);
        quests.push(quest);
      }
    });

    return quests;
  }

  private parseQuestContent(title: string, content: string): ScrapedQuest {
    const steps: ScrapedStep[] = [];

    // 解析步骤（根据实际格式调整）
    const stepRegex = /步骤(\d+)[：:](.*?)(?=步骤\d+|$)/g;
    let match;
    while ((match = stepRegex.exec(content)) !== null) {
      steps.push({
        description: this.cleanText(match[2]),
      });
    }

    // 判断任务类型
    let type: QuestType = QuestType.Main;
    if (title.includes('支线') || title.includes('可选')) {
      type = QuestType.Side;
    } else if (title.includes('同伴') || title.includes('队友')) {
      type = QuestType.Companion;
    }

    return {
      name: title,
      type,
      description: '',
      chapter_name: '第一章', // 需根据页面信息确定
      steps
    };
  }
}