// Types matching the database schema

export type QuestType = 'main' | 'side' | 'companion';

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

// Combined quest with steps for display
export interface QuestWithSteps extends Quest {
  steps: QuestStep[];
  chapter_name: string;
}