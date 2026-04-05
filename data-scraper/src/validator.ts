// src/validator.ts
import { ScrapedQuest } from './models';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ValidationSummary {
  total: number;
  validCount: number;
  invalidCount: number;
  errors: string[];
}

export class DataValidator {
  validateQuest(quest: ScrapedQuest): ValidationResult {
    const errors: string[] = [];

    if (!quest.name || quest.name.trim().length === 0) {
      errors.push('Quest name is empty');
    }

    if (!quest.chapter_name || quest.chapter_name.trim().length === 0) {
      errors.push('Quest chapter is empty');
    }

    if (!quest.steps || quest.steps.length === 0) {
      errors.push('Quest has no valid steps');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateQuests(quests: ScrapedQuest[]): ValidationSummary {
    const results = quests.map(q => ({ quest: q, result: this.validateQuest(q) }));
    const validQuests = results.filter(r => r.result.valid);
    const invalidQuests = results.filter(r => !r.result.valid);

    return {
      total: quests.length,
      validCount: validQuests.length,
      invalidCount: invalidQuests.length,
      errors: invalidQuests.flatMap(r => r.result.errors.map(e => `${r.quest.name}: ${e}`))
    };
  }

  filterValidQuests(quests: ScrapedQuest[]): ScrapedQuest[] {
    return quests.filter(q => this.validateQuest(q).valid);
  }
}