// __tests__/models.test.ts
import { Chapter, Quest, QuestStep, Choice, QuestType } from '../src/models';

describe('models', () => {
  describe('QuestType', () => {
    it('should have valid quest types', () => {
      expect(QuestType.Main).toBe('main');
      expect(QuestType.Side).toBe('side');
      expect(QuestType.Companion).toBe('companion');
    });
  });

  describe('Chapter', () => {
    it('should create a valid chapter', () => {
      const chapter: Chapter = {
        id: 1,
        name: '第一章',
        order: 1
      };
      expect(chapter.id).toBe(1);
      expect(chapter.name).toBe('第一章');
    });
  });

  describe('Quest', () => {
    it('should create a valid quest', () => {
      const quest: Quest = {
        id: 1,
        chapter_id: 1,
        name: '逃离鹦鹉螺',
        type: QuestType.Main,
        description: '任务描述',
        prerequisites: []
      };
      expect(quest.type).toBe('main');
      expect(quest.prerequisites).toEqual([]);
    });
  });

  describe('QuestStep', () => {
    it('should create a valid step', () => {
      const step: QuestStep = {
        id: 1,
        quest_id: 1,
        order: 1,
        description: '步骤描述',
        location: '鹦鹉螺号',
        rewards: ['金币']
      };
      expect(step.location).toBe('鹦鹉螺号');
      expect(step.rewards).toContain('金币');
    });
  });

  describe('Choice', () => {
    it('should create a valid choice', () => {
      const choice: Choice = {
        id: 1,
        step_id: 1,
        description: '选择A',
        consequences: ['后果1'],
        leads_to_step_id: 2
      };
      expect(choice.leads_to_step_id).toBe(2);
    });
  });
});