// __tests__/exporter.test.ts
import { SQLiteExporter } from '../src/exporter';
import { QuestType } from '../src/models';
import * as fs from 'fs';
import * as path from 'path';

describe('SQLiteExporter', () => {
  const testDbPath = path.join(__dirname, '../data/test.db');
  let exporter: SQLiteExporter;

  beforeEach(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    exporter = new SQLiteExporter(testDbPath);
    await exporter.init();
  });

  afterEach(() => {
    exporter.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should create database file', async () => {
    await exporter.save();
    expect(fs.existsSync(testDbPath)).toBe(true);
  });

  it('should create tables', async () => {
    const tables = exporter.getTables();
    expect(tables).toContain('chapters');
    expect(tables).toContain('quests');
    expect(tables).toContain('quest_steps');
    expect(tables).toContain('choices');
  });

  it('should insert and retrieve chapter', async () => {
    exporter.insertChapter('第一章', 1);
    await exporter.save();
    const chapters = exporter.getChapters();
    expect(chapters.length).toBe(1);
    expect(chapters[0].name).toBe('第一章');
  });

  it('should insert and retrieve quest', async () => {
    exporter.insertChapter('第一章', 1);
    exporter.insertQuest(1, '测试任务', QuestType.Main, '描述', []);
    await exporter.save();
    const quests = exporter.getQuests();
    expect(quests.length).toBe(1);
    expect(quests[0].name).toBe('测试任务');
  });
});