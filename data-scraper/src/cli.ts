// src/cli.ts
import { getAllScrapers } from './scrapers/index';
import { DataCleaner } from './cleaner';
import { DataValidator } from './validator';
import { SQLiteExporter } from './exporter';
import { TaskSplitter } from './task-splitter';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../data');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const DB_PATH = path.join(DATA_DIR, 'bg3_guide.db');

async function scrape() {
  console.log('Starting scrape process...');
  const scrapers = getAllScrapers();
  const cleaner = new DataCleaner();
  const validator = new DataValidator();
  const splitter = new TaskSplitter();

  if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
  }

  let allQuests: any[] = [];

  for (const scraper of scrapers) {
    console.log(`Scraping from ${scraper.name}...`);
    try {
      const result = await scraper.scrape();
      console.log(`  Found ${result.quests.length} raw quests`);

      if (result.errors && result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.join(', ')}`);
      }

      const rawPath = path.join(RAW_DIR, `${scraper.name}_${Date.now()}.json`);
      fs.writeFileSync(rawPath, JSON.stringify(result, null, 2));

      // 清洗数据
      const cleaned = cleaner.cleanQuests(result.quests);

      // 拆分为更细粒度的任务
      const splitQuests: any[] = [];
      for (const quest of cleaned) {
        const split = splitter.splitIntoQuests(quest);
        splitQuests.push(...split);
      }
      console.log(`  Split into ${splitQuests.length} quests`);

      allQuests.push(...splitQuests);
    } catch (error) {
      console.error(`  Failed: ${error}`);
    }
  }

  console.log('\nValidating data...');
  const validation = validator.validateQuests(allQuests);
  console.log(`  Total: ${validation.total}`);
  console.log(`  Valid: ${validation.validCount}`);
  console.log(`  Invalid: ${validation.invalidCount}`);

  if (validation.errors.length > 0) {
    console.log('\nValidation errors:');
    validation.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
  }

  const validQuests = validator.filterValidQuests(allQuests);

  // 按章节排序
  const sortedQuests = splitter.sortQuestsByChapter(validQuests);
  console.log(`\nFinal: ${sortedQuests.length} valid quests (sorted by chapter)`);

  // 显示任务分布
  const chapters = new Map<string, number>();
  for (const q of sortedQuests) {
    chapters.set(q.chapter_name, (chapters.get(q.chapter_name) || 0) + 1);
  }
  console.log('\nBy chapter:');
  for (const [chapter, count] of chapters) {
    console.log(`  ${chapter}: ${count} quests`);
  }

  return sortedQuests;
}

async function exportToDb(quests?: any[]) {
  console.log('\nExporting to SQLite...');

  if (!quests) {
    quests = loadRawData();
  }

  if (quests.length === 0) {
    console.log('No quests to export. Run scrape first.');
    return;
  }

  const exporter = new SQLiteExporter(DB_PATH);
  await exporter.init();
  exporter.exportScrapedQuests(quests);
  await exporter.save();
  exporter.close();

  console.log(`Database created at: ${DB_PATH}`);
}

function loadRawData(): any[] {
  if (!fs.existsSync(RAW_DIR)) {
    return [];
  }

  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.json'));
  let quests: any[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(RAW_DIR, file), 'utf-8');
    const data = JSON.parse(content);
    quests.push(...data.quests);
  }

  const cleaner = new DataCleaner();
  const validator = new DataValidator();
  const splitter = new TaskSplitter();

  // 清洗、拆分、验证
  const cleaned = cleaner.cleanQuests(quests);
  const splitQuests: any[] = [];
  for (const quest of cleaned) {
    const split = splitter.splitIntoQuests(quest);
    splitQuests.push(...split);
  }

  return validator.filterValidQuests(splitQuests);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'scrape':
      const quests = await scrape();
      await exportToDb(quests);
      break;
    case 'export':
      await exportToDb();
      break;
    case 'clean':
      const rawData = loadRawData();
      await exportToDb(rawData);
      break;
    default:
      console.log('Usage: ts-node src/cli.ts [scrape|export|clean]');
      console.log('  scrape - 爬取数据并导出');
      console.log('  export - 从已有原始数据导出');
      console.log('  clean  - 重新清洗原始数据并导出');
  }
}

main().catch(console.error);