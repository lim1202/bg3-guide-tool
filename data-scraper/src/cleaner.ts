// src/cleaner.ts
import { ScrapedQuest, ScrapedStep, QuestType, ScrapedChoice } from './models';

export class DataCleaner {
  cleanQuest(quest: ScrapedQuest): ScrapedQuest {
    return {
      name: this.cleanQuestName(quest.name),
      type: this.normalizeQuestType(quest.type),
      description: this.cleanText(quest.description),
      chapter_name: this.cleanText(quest.chapter_name),
      steps: this.cleanSteps(quest.steps)
    };
  }

  cleanQuests(quests: ScrapedQuest[]): ScrapedQuest[] {
    return quests.map(q => this.cleanQuest(q)).filter(q => q.name.length > 0);
  }

  private cleanQuestName(name: string): string {
    let cleaned = this.cleanText(name);
    // 移除常见的前缀标记
    cleaned = cleaned.replace(/【[^】]*】/g, '');
    cleaned = cleaned.replace(/\[[^\]]*\]/g, '');
    cleaned = cleaned.replace(/^(主线|支线|同伴任务)[：:]/, '');
    return this.cleanText(cleaned);
  }

  private normalizeQuestType(type: QuestType): QuestType {
    const validTypes = [QuestType.Main, QuestType.Side, QuestType.Companion];
    if (validTypes.includes(type)) {
      return type;
    }
    return QuestType.Main; // 默认主线
  }

  private cleanSteps(steps: ScrapedStep[]): ScrapedStep[] {
    return steps
      .map(step => this.cleanStep(step))
      .filter(step => step.description.length > 0);
  }

  private cleanStep(step: ScrapedStep): ScrapedStep {
    return {
      description: this.cleanText(step.description),
      location: step.location ? this.cleanText(step.location) : undefined,
      rewards: step.rewards?.map(r => this.cleanText(r)).filter(r => r.length > 0),
      choices: step.choices?.map(c => this.cleanChoice(c))
    };
  }

  private cleanChoice(choice: ScrapedChoice): ScrapedChoice {
    return {
      description: this.cleanText(choice.description),
      consequences: choice.consequences.map(c => this.cleanText(c))
    };
  }

  cleanText(text: string): string {
    if (!text) return '';
    // 移除HTML标签
    let cleaned = text.replace(/<[^>]*>/g, '');
    // 规范化空白字符
    cleaned = cleaned.replace(/\s+/g, ' ');
    // 移除特殊字符
    cleaned = cleaned.replace(/[●○◆◇■□]/g, '');
    return cleaned.trim();
  }
}