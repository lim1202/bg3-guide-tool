// __tests__/cleaner.test.ts
import { DataCleaner } from '../src/cleaner';
import { ScrapedQuest, QuestType } from '../src/models';

describe('DataCleaner', () => {
  const cleaner = new DataCleaner();

  describe('cleanQuest', () => {
    it('should clean quest name', () => {
      const quest: ScrapedQuest = {
        name: '  【主线】逃离鹦鹉螺号  ',
        type: QuestType.Main,
        description: '',
        chapter_name: '第一章',
        steps: []
      };
      const cleaned = cleaner.cleanQuest(quest);
      expect(cleaned.name).toBe('逃离鹦鹉螺号');
    });

    it('should remove empty steps', () => {
      const quest: ScrapedQuest = {
        name: '测试任务',
        type: QuestType.Main,
        description: '',
        chapter_name: '第一章',
        steps: [
          { description: '有效步骤' },
          { description: '' },
          { description: '   ' },
          { description: '另一个有效步骤' }
        ]
      };
      const cleaned = cleaner.cleanQuest(quest);
      expect(cleaned.steps.length).toBe(2);
    });

    it('should normalize quest type', () => {
      const quest: ScrapedQuest = {
        name: '任务',
        type: 'unknown' as QuestType,
        description: '',
        chapter_name: '第一章',
        steps: []
      };
      const cleaned = cleaner.cleanQuest(quest);
      expect(cleaned.type).toBe(QuestType.Main);
    });
  });

  describe('cleanText', () => {
    it('should remove html tags', () => {
      const text = '<p>步骤描述</p>';
      expect(cleaner.cleanText(text)).toBe('步骤描述');
    });

    it('should normalize whitespace', () => {
      const text = '步骤   描述\n\n内容';
      expect(cleaner.cleanText(text)).toBe('步骤 描述 内容');
    });
  });
});