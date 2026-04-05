// src/task-splitter.ts
import { ScrapedQuest, ScrapedStep, QuestType } from './models';

// 关键地点/章节关键词
const CHAPTER_MARKERS = [
  { chapter: '序章', keywords: ['螺壳舰', '鹦鹉螺', '地狱', '扎尔克'] },
  { chapter: '第一章', keywords: ['海滩', '坠毁', '礼拜堂', '德鲁伊', '林地', '地精', '提夫林'] },
  { chapter: '第二章', keywords: ['月出之塔', '月出', '暗影', '诅咒之地', '旅店', '贾希拉'] },
  { chapter: '第三章', keywords: ['博德之门', '下城区', '上城区', '戈塔什', '奥林'] },
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
   */
  splitIntoQuests(sourceQuest: ScrapedQuest): ScrapedQuest[] {
    if (sourceQuest.type === QuestType.Side) {
      return this.splitSideQuests(sourceQuest);
    }
    return this.splitMainQuests(sourceQuest);
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