// Types matching the Rust backend

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
  q_type: string;
  description: string;
  prerequisites: string;
  chapter_name: string | null;
}

export interface QuestStep {
  id: number;
  quest_id: number;
  order: number;
  description: string;
  location: string | null;
  rewards: string; // JSON string from backend
}

export interface Choice {
  id: number;
  step_id: number;
  description: string;
  consequences: string[];
  leads_to_step_id: number | null;
}

// Combined quest with steps for display
export interface QuestWithSteps {
  id: number;
  chapter_id: number;
  name: string;
  q_type: string;
  description: string;
  prerequisites: number[];
  chapter_name: string;
  steps: QuestStep[];
}

// Helper to parse rewards JSON
export function parseRewards(rewardsJson: string): string[] {
  try {
    const parsed = JSON.parse(rewardsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Helper to get quest type display name
export function getQuestTypeDisplay(type: string): string {
  switch (type) {
    case 'main': return '主线';
    case 'side': return '支线';
    case 'companion': return '同伴';
    default: return type;
  }
}