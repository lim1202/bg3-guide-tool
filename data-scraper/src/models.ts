// src/models.ts

export enum QuestType {
  Main = 'main',
  Side = 'side',
  Companion = 'companion'
}

export interface Chapter {
  id: number;
  name: string;
  order: number;
}

export interface Quest {
  id: number;
  chapter_id: number;
  name: string;
  type: QuestType;
  description: string;
  prerequisites: number[];
}

export interface QuestStep {
  id: number;
  quest_id: number;
  order: number;
  description: string;
  location: string | null;
  rewards: string[];
}

export interface Choice {
  id: number;
  step_id: number;
  description: string;
  consequences: string[];
  leads_to_step_id: number | null;
}

export interface ScrapedQuest {
  name: string;
  type: QuestType;
  description: string;
  chapter_name: string;
  steps: ScrapedStep[];
}

export interface ScrapedStep {
  description: string;
  location?: string;
  rewards?: string[];
  choices?: ScrapedChoice[];
}

export interface ScrapedChoice {
  description: string;
  consequences: string[];
}