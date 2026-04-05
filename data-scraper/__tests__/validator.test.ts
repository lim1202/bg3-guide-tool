// __tests__/validator.test.ts
import { DataValidator, ValidationResult } from '../src/validator';
import { ScrapedQuest, QuestType } from '../src/models';

describe('DataValidator', () => {
  const validator = new DataValidator();

  describe('validateQuest', () => {
    it('should pass valid quest', () => {
      const quest: ScrapedQuest = {
        name: '逃离鹦鹉螺号',
        type: QuestType.Main,
        description: '任务描述',
        chapter_name: '第一章',
        steps: [{ description: '步骤1' }]
      };
      const result = validator.validateQuest(quest);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail quest without name', () => {
      const quest: ScrapedQuest = {
        name: '',
        type: QuestType.Main,
        description: '',
        chapter_name: '第一章',
        steps: []
      };
      const result = validator.validateQuest(quest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Quest name is empty');
    });

    it('should fail quest without steps', () => {
      const quest: ScrapedQuest = {
        name: '测试任务',
        type: QuestType.Main,
        description: '',
        chapter_name: '第一章',
        steps: []
      };
      const result = validator.validateQuest(quest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Quest has no valid steps');
    });
  });

  describe('validateQuests', () => {
    it('should return summary', () => {
      const quests: ScrapedQuest[] = [
        { name: '任务1', type: QuestType.Main, description: '', chapter_name: '第一章', steps: [{ description: 's1' }] },
        { name: '', type: QuestType.Main, description: '', chapter_name: '第一章', steps: [] },
      ];
      const result = validator.validateQuests(quests);
      expect(result.total).toBe(2);
      expect(result.validCount).toBe(1);
      expect(result.invalidCount).toBe(1);
    });
  });
});