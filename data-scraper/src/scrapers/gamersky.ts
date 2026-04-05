// src/scrapers/gamersky.ts
import * as cheerio from 'cheerio';
import { BaseScraper, ScraperResult } from './base';
import { ScrapedQuest, QuestType, ScrapedStep } from '../models';

// 章节映射 - 根据关键词确定章节
const CHAPTER_KEYWORDS: Record<string, string> = {
  // 序章
  '螺壳舰': '序章',
  '鹦鹉螺': '序章',
  '地狱': '序章',
  '纳': '序章',
  '孵化仓': '序章',
  '米纳斯': '序章',
  // 第一章
  '海滩': '第一章',
  '礼拜堂': '第一章',
  '德鲁伊': '第一章',
  '林地': '第一章',
  '翠绿林地': '第一章',
  '地精': '第一章',
  '提夫林': '第一章',
  '养育间': '第一章',
  '吉斯洋基': '第一章',
  '幽暗地域': '第一章',
  '蕈人': '第一章',
  '染疫村落': '第一章',
  '染疫': '第一章',
  '河口': '第一章',
  '散林塔': '第一章',
  '复仇之炉': '第一章',
  '瑰晨修道院': '第一章',
  '晋升之路': '第一章',
  '日照湿地': '第一章',
  '夺心魔巢穴': '第一章',
  '河边茶室': '第一章',
  // 第二章
  '月出之塔': '第二章',
  '月出': '第二章',
  '暗影': '第二章',
  '诅咒之地': '第二章',
  '旅店': '第二章',
  '终焉光芒': '第二章',
  '贾希拉': '第二章',
  '陵墓': '第二章',
  '大陵寝': '第二章',
  '沙洛佛克': '第二章',
  '幽影诅咒': '第二章',
  '莎尔的试炼': '第二章',
  '蔽影战场': '第二章',
  '雷思文': '第二章',
  '雷斯文小镇': '第二章',
  '飞龙关': '第二章',
  '飞龙岩': '第二章',
  '卡扎多尔': '第二章',
  '希望之邸': '第二章',
  '巴尔神殿': '第二章',
  // 第三章
  '博德之门': '第三章',
  '下城区': '第三章',
  '上城区': '第三章',
  '戈塔什': '第三章',
  '奥林': '第三章',
  '钢铁': '第三章',
  '利文顿': '第三章',
  '最终决战': '第三章',
};

export class GamerskyScraper extends BaseScraper {
  get name(): string {
    return 'gamersky';
  }

  get baseUrl(): string {
    return 'https://www.gamersky.com';
  }

  private guideUrls = [
    { url: 'https://www.gamersky.com/handbook/202308/1628448.shtml', type: QuestType.Main, name: '全流程图文攻略' },
    { url: 'https://www.gamersky.com/handbook/202308/1635334.shtml', type: QuestType.Side, name: '全支线及伙伴任务攻略' },
  ];

  async scrape(): Promise<ScraperResult> {
    const quests: ScrapedQuest[] = [];
    const errors: string[] = [];

    for (const guide of this.guideUrls) {
      try {
        console.log(`  Fetching pages from ${guide.name}...`);
        const pages = await this.fetchAllPages(guide.url);
        console.log(`  Got ${pages.length} pages`);
        const pageQuests = this.parsePagesToQuests(pages, guide.type, guide.name);
        quests.push(...pageQuests);
        console.log(`  Created ${pageQuests.length} quests`);
      } catch (error) {
        errors.push(`Failed to scrape ${guide.url}: ${error}`);
      }
    }

    return {
      source: this.name,
      quests,
      timestamp: new Date().toISOString(),
      errors
    };
  }

  private async fetchAllPages(startUrl: string): Promise<Array<{ $: cheerio.CheerioAPI; pageNum: number }>> {
    const pages: Array<{ $: cheerio.CheerioAPI; pageNum: number }> = [];

    // 获取第一页
    const $ = await this.fetchPage(startUrl);
    pages.push({ $, pageNum: 1 });

    // 获取所有分页链接 - 使用多种选择器
    const allPages: string[] = [];

    // 尝试多种分页选择器
    $('.page_css a, .page a, li a[href*="_"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('_') && href.endsWith('.shtml')) {
        allPages.push(href);
      }
    });

    // 也尝试从页面标题列表获取
    $('a[href*="handbook"][href*="_"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.endsWith('.shtml')) {
        allPages.push(href);
      }
    });

    // 提取页码并排序
    const pageUrls = new Map<number, string>();
    allPages.forEach(href => {
      const match = href.match(/_(\d+)\.shtml$/);
      if (match) {
        const pageNum = parseInt(match[1]);
        if (!pageUrls.has(pageNum)) {
          pageUrls.set(pageNum, href);
        }
      }
    });

    console.log(`    Found ${pageUrls.size} unique page URLs`);

    // 按页码顺序获取所有页面
    const sortedPages = [...pageUrls.entries()].sort((a, b) => a[0] - b[0]);

    for (const [pageNum, url] of sortedPages) {
      try {
        const page$ = await this.fetchPage(url);
        pages.push({ $: page$, pageNum });
        console.log(`    Fetched page ${pageNum}`);
      } catch (e) {
        console.log(`    Failed to fetch page ${pageNum}: ${e}`);
      }
    }

    return pages;
  }

  private parsePagesToQuests(
    pages: Array<{ $: cheerio.CheerioAPI; pageNum: number }>,
    defaultType: QuestType,
    guideName: string
  ): ScrapedQuest[] {
    const quests: ScrapedQuest[] = [];

    for (const { $, pageNum } of pages) {
      // 从页面标题提取地点信息
      // 标题格式: 《博德之门3》正式版全流程图文攻略 正式版全地图探索流程攻略_螺壳舰-游民星空
      const pageTitle = $('title').text();
      const titleParts = pageTitle.split('_');

      // 提取地点名称（下划线后面的部分）
      let locationName = '';
      if (titleParts.length > 1) {
        const afterUnderscore = titleParts[1].split('-')[0].trim();
        locationName = afterUnderscore;
      }

      // 从地点名称推断章节
      const chapter = this.detectChapter(locationName || pageTitle);

      // 使用地点名称作为任务名
      const questName = locationName || `${guideName} - 第${pageNum}页`;

      // 解析步骤和图片
      const steps = this.parseStepsWithImages($);

      if (steps.length > 0) {
        quests.push({
          name: questName,
          type: defaultType,
          description: `第 ${pageNum} 页`,
          chapter_name: chapter,
          steps
        });
      }
    }

    return quests;
  }

  private parseStepsWithImages($: cheerio.CheerioAPI): ScrapedStep[] {
    const steps: ScrapedStep[] = [];
    let currentStep: ScrapedStep | null = null;

    // 遍历内容区域的所有元素
    $('.Mid2L_con').children().each((_, el) => {
      const $el = $(el);
      const tagName = el.tagName.toLowerCase();

      if (tagName === 'p') {
        const text = this.cleanText($el.text());

        // 检查段落中的图片
        const img = $el.find('img');
        const imgSrc = img.attr('data-src') || img.attr('src');

        if (imgSrc && !imgSrc.includes('blank.png')) {
          // 如果有图片，创建新步骤
          if (currentStep) {
            steps.push(currentStep);
          }
          currentStep = {
            description: text || '参考图片',
            image: imgSrc
          };
        } else if (text.length > 20) {
          // 纯文本段落
          if (!currentStep) {
            currentStep = { description: text };
          } else if (currentStep.image && currentStep.description === '参考图片') {
            // 有图片但没有描述，添加描述
            currentStep.description = text;
          } else if (currentStep.description && currentStep.description.length > 100) {
            // 当前步骤内容较长，保存并开始新步骤
            steps.push(currentStep);
            currentStep = { description: text };
          } else {
            // 追加到当前步骤
            currentStep.description = `${currentStep.description}\n${text}`;
          }
        }
      } else if (tagName === 'h2' || tagName === 'h3') {
        // 标题作为新步骤的分隔
        const text = this.cleanText($el.text());
        if (text.length > 3) {
          if (currentStep) {
            steps.push(currentStep);
          }
          currentStep = { description: `【${text}】` };
        }
      }
    });

    // 保存最后一个步骤
    if (currentStep) {
      steps.push(currentStep);
    }

    return steps;
  }

  private detectChapter(text: string): string {
    // 从文本中检测章节
    for (const [keyword, chapter] of Object.entries(CHAPTER_KEYWORDS)) {
      if (text.includes(keyword)) {
        return chapter;
      }
    }
    return '综合';
  }
}