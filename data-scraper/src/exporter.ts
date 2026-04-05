// src/exporter.ts
import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { ScrapedQuest, Chapter, Quest, QuestStep, Choice, QuestType } from './models';

export class SQLiteExporter {
  private db: Database | null = null;
  private dbPath: string;
  private SQL: any;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async init(): Promise<void> {
    const sqlJsPath = path.join(
      path.dirname(require.resolve('sql.js')),
      'sql-wasm.wasm'
    );
    const sqlJsWasmBinary = fs.readFileSync(sqlJsPath);
    const wasmArrayBuffer = sqlJsWasmBinary.buffer.slice(
      sqlJsWasmBinary.byteOffset,
      sqlJsWasmBinary.byteOffset + sqlJsWasmBinary.byteLength
    );

    this.SQL = await initSqlJs({
      wasmBinary: wasmArrayBuffer
    });

    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new this.SQL.Database();
    this.createTables();
  }

  private createTables(): void {
    this.db!.run(`
      CREATE TABLE IF NOT EXISTS chapters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        \`order\` INTEGER NOT NULL
      )
    `);

    this.db!.run(`
      CREATE TABLE IF NOT EXISTS quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chapter_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        prerequisites TEXT,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id)
      )
    `);

    this.db!.run(`
      CREATE TABLE IF NOT EXISTS quest_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quest_id INTEGER NOT NULL,
        \`order\` INTEGER NOT NULL,
        description TEXT NOT NULL,
        location TEXT,
        rewards TEXT,
        FOREIGN KEY (quest_id) REFERENCES quests(id)
      )
    `);

    this.db!.run(`
      CREATE TABLE IF NOT EXISTS choices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        step_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        consequences TEXT,
        leads_to_step_id INTEGER,
        FOREIGN KEY (step_id) REFERENCES quest_steps(id)
      )
    `);

    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_quests_chapter ON quests(chapter_id)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_steps_quest ON quest_steps(quest_id)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_choices_step ON choices(step_id)`);
  }

  async save(): Promise<void> {
    const data = this.db!.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  insertChapter(name: string, order: number): number {
    this.db!.run('INSERT INTO chapters (name, `order`) VALUES (?, ?)', [name, order]);
    const result = this.db!.exec('SELECT last_insert_rowid() as id');
    return result[0].values[0][0] as number;
  }

  insertQuest(chapterId: number, name: string, type: QuestType, description: string, prerequisites: number[]): number {
    this.db!.run(
      'INSERT INTO quests (chapter_id, name, type, description, prerequisites) VALUES (?, ?, ?, ?, ?)',
      [chapterId, name, type, description || '', JSON.stringify(prerequisites)]
    );
    const result = this.db!.exec('SELECT last_insert_rowid() as id');
    return result[0].values[0][0] as number;
  }

  insertQuestStep(questId: number, order: number, description: string, location: string | null, rewards: string[]): number {
    this.db!.run(
      'INSERT INTO quest_steps (quest_id, `order`, description, location, rewards) VALUES (?, ?, ?, ?, ?)',
      [questId, order, description, location || null, JSON.stringify(rewards)]
    );
    const result = this.db!.exec('SELECT last_insert_rowid() as id');
    return result[0].values[0][0] as number;
  }

  insertChoice(stepId: number, description: string, consequences: string[], leadsToStepId: number | null): number {
    this.db!.run(
      'INSERT INTO choices (step_id, description, consequences, leads_to_step_id) VALUES (?, ?, ?, ?)',
      [stepId, description, JSON.stringify(consequences), leadsToStepId]
    );
    const result = this.db!.exec('SELECT last_insert_rowid() as id');
    return result[0].values[0][0] as number;
  }

  getTables(): string[] {
    const result = this.db!.exec("SELECT name FROM sqlite_master WHERE type='table'");
    return result[0]?.values.map((v: any) => v[0] as string) || [];
  }

  getChapters(): Chapter[] {
    const result = this.db!.exec('SELECT * FROM chapters ORDER BY `order`');
    if (!result[0]) return [];
    const columns = result[0].columns;
    return result[0].values.map((v: any[]) => ({
      id: v[columns.indexOf('id')],
      name: v[columns.indexOf('name')],
      order: v[columns.indexOf('order')]
    }));
  }

  getQuests(): Quest[] {
    const result = this.db!.exec('SELECT * FROM quests');
    if (!result[0]) return [];
    const columns = result[0].columns;
    return result[0].values.map((v: any[]) => ({
      id: v[columns.indexOf('id')],
      chapter_id: v[columns.indexOf('chapter_id')],
      name: v[columns.indexOf('name')],
      type: v[columns.indexOf('type')] as QuestType,
      description: v[columns.indexOf('description')],
      prerequisites: JSON.parse(v[columns.indexOf('prerequisites')] || '[]')
    }));
  }

  exportScrapedQuests(quests: ScrapedQuest[]): void {
    const chapterMap = new Map<string, number>();

    for (const quest of quests) {
      let chapterId = chapterMap.get(quest.chapter_name);
      if (!chapterId) {
        chapterId = this.insertChapter(quest.chapter_name, chapterMap.size + 1);
        chapterMap.set(quest.chapter_name, chapterId);
      }

      const questId = this.insertQuest(chapterId, quest.name, quest.type, quest.description, []);

      for (let i = 0; i < quest.steps.length; i++) {
        const step = quest.steps[i];
        const stepId = this.insertQuestStep(questId, i + 1, step.description, step.location || null, step.rewards || []);

        if (step.choices) {
          for (const choice of step.choices) {
            this.insertChoice(stepId, choice.description, choice.consequences, null);
          }
        }
      }
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}