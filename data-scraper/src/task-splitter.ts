// src/task-splitter.ts
import { ScrapedQuest, ScrapedStep, QuestType } from './models';

// 章节排序顺序
const CHAPTER_ORDER: Record<string, number> = {
  '序章': 1,
  '第一章': 2,
  '第二章': 3,
  '第三章': 4,
  '综合': 99,
};

// 关键地点/章节关键词 - 扩展关键词覆盖更多地点
const CHAPTER_MARKERS = [
  { chapter: '序章', keywords: ['螺壳舰', '鹦鹉螺', '地狱', '扎尔克', '纳', '孵化仓', '米纳斯'] },
  { chapter: '第一章', keywords: [
    '海滩', '坠毁', '礼拜堂', '德鲁伊', '林地', '翠绿林地', '地精', '提夫林', '养育间',
    '幽暗地域', '蕈人', '染疫村落', '染疫', '河口', '散林塔', '复仇之炉', '瑰晨修道院',
    '晋升之路', '日照湿地', '夺心魔巢穴', '河边茶室', '蕈人栖息地', '格拉特', '巴伦'
  ] },
  { chapter: '第二章', keywords: [
    '月出之塔', '月出', '暗影', '诅咒之地', '旅店', '终焉光芒', '贾希拉', '陵墓', '大陵寝',
    '沙洛佛克', '伊斯梅尔', '幽影诅咒', '莎尔的试炼', '蔽影战场', '雷思文', '雷斯文小镇',
    '飞龙关', '飞龙岩', '卡扎多尔', '希望之邸', '巴尔神殿', '哈尔辛'
  ] },
  { chapter: '第三章', keywords: [
    '博德之门', '下城区', '上城区', '戈塔什', '奥林', '钢铁', '利文顿', '最终决战',
    '龙王戟', '精灵歌酒馆', '城市广场', '费尔罗', '风车'
  ] },
];

// 任务名称识别模式
const QUEST_PATTERNS = [
  /^(.+?)[:：]/,  // 中文冒号分隔
  /【(.+?)】/,    // 中文方括号
  /^任务[：:]\s*(.+)/,
];

export class TaskSplitter {
  /**
   * 将大型攻略拆分为独立任务
   * 如果输入已经是小任务，直接返回
   */
  splitIntoQuests(sourceQuest: ScrapedQuest): ScrapedQuest[] {
    // 如果任务已经有合理的章节数量且步骤不过多，直接返回
    if (sourceQuest.chapter_name !== '综合' || sourceQuest.steps.length < 50) {
      return [sourceQuest];
    }

    // 大型任务需要拆分
    if (sourceQuest.type === QuestType.Side) {
      return this.splitSideQuests(sourceQuest);
    }
    return this.splitMainQuests(sourceQuest);
  }

  /**
   * 按章节排序任务
   */
  sortQuestsByChapter(quests: ScrapedQuest[]): ScrapedQuest[] {
    return quests.sort((a, b) => {
      const orderA = CHAPTER_ORDER[a.chapter_name] || 99;
      const orderB = CHAPTER_ORDER[b.chapter_name] || 99;
      return orderA - orderB;
    });
  }

  /**
   * 拆分主线任务 - 按章节划分
   */
  private splitMainQuests(sourceQuest: ScrapedQuest): ScrapedQuest[] {
    const quests: ScrapedQuest[] = [];
    let currentChapter = '序章';
    let currentSteps: ScrapedStep[] = [];
    let questName = '';

    for (const step of sourceQuest.steps) {
      const detectedChapter = this.detectChapter(step.description);

      if (detectedChapter && detectedChapter !== currentChapter) {
        // 保存当前章节的任务
        if (currentSteps.length > 0) {
          quests.push({
            name: questName || `${currentChapter}流程`,
            type: QuestType.Main,
            description: '',
            chapter_name: currentChapter,
            steps: currentSteps
          });
        }
        currentChapter = detectedChapter;
        currentSteps = [];
        questName = `${currentChapter}流程`;
      }

      currentSteps.push(step);
    }

    // 保存最后一个章节
    if (currentSteps.length > 0) {
      quests.push({
        name: questName || `${currentChapter}流程`,
        type: QuestType.Main,
        description: '',
        chapter_name: currentChapter,
        steps: currentSteps
      });
    }

    return quests;
  }

  /**
   * 拆分支线任务 - 识别独立任务
   */
  private splitSideQuests(sourceQuest: ScrapedQuest): ScrapedQuest[] {
    const quests: ScrapedQuest[] = [];
    let currentQuest: ScrapedQuest | null = null;

    for (const step of sourceQuest.steps) {
      const questName = this.extractQuestName(step.description);

      if (questName) {
        // 保存之前的任务
        if (currentQuest && currentQuest.steps.length > 0) {
          quests.push(currentQuest);
        }
        // 开始新任务
        currentQuest = {
          name: questName,
          type: QuestType.Side,
          description: '',
          chapter_name: this.detectChapter(step.description) || '综合',
          steps: [step]
        };
      } else if (currentQuest) {
        currentQuest.steps.push(step);
      } else {
        // 没有任务名的段落，创建一个通用任务
        currentQuest = {
          name: '支线任务',
          type: QuestType.Side,
          description: '',
          chapter_name: this.detectChapter(step.description) || '综合',
          steps: [step]
        };
      }
    }

    // 保存最后一个任务
    if (currentQuest && currentQuest.steps.length > 0) {
      quests.push(currentQuest);
    }

    return quests;
  }

  /**
   * 检测段落所属章节
   */
  private detectChapter(text: string): string | null {
    for (const marker of CHAPTER_MARKERS) {
      for (const keyword of marker.keywords) {
        if (text.includes(keyword)) {
          return marker.chapter;
        }
      }
    }
    return null;
  }

  /**
   * 从段落中提取任务名称
   */
  private extractQuestName(text: string): string | null {
    for (const pattern of QUEST_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length > 2 && name.length < 30) {
          return name;
        }
      }
    }
    return null;
  }
}