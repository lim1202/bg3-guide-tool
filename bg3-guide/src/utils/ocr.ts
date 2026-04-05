import { createWorker } from 'tesseract.js';
import { QuestWithSteps } from '../types';

// OCR result with progress tracking
export interface OcrResult {
  text: string;
  confidence: number;
}

// Quest match result
export interface QuestMatch {
  quest: QuestWithSteps;
  score: number; // 0-100 match percentage
  matchedText: string; // The portion of text that matched
}

/**
 * Recognize text from an image using Tesseract OCR
 * @param image - Image blob or URL to process
 * @param onProgress - Progress callback (0-100)
 */
export async function recognizeText(
  image: Blob | string,
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  try {
    // Create worker with proper configuration for production
    const worker = await createWorker('chi_sim+eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      }
    });

    const result = await worker.recognize(image);
    await worker.terminate();

    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence,
    };
  } catch (error) {
    throw new Error(`OCR识别失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Normalize text for comparison (remove whitespace, punctuation, lowercase)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]/g, '') // Keep alphanumeric and Chinese characters
    .trim();
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a score from 0-100
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  if (s1.length === 0 || s2.length === 0) return 0;

  // Simple containment check - if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorterLength = Math.min(s1.length, s2.length);
    const longerLength = Math.max(s1.length, s2.length);
    return Math.round((shorterLength / longerLength) * 100);
  }

  // Levenshtein distance calculation
  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = Math.round((1 - distance / maxLength) * 100);

  return Math.max(0, similarity);
}

/**
 * Extract potential quest names from OCR text
 * Looks for patterns like task titles in game UI
 */
function extractPotentialQuestNames(text: string): string[] {
  // Split by common delimiters in game UI
  const lines = text.split(/\n+/).filter(line => line.trim().length > 0);

  // Filter lines that could be quest names (typically short, meaningful)
  const potentialNames: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Quest names are usually short (less than 30 chars after normalization)
    // and contain meaningful words
    if (trimmed.length >= 2 && trimmed.length <= 50) {
      potentialNames.push(trimmed);
    }
  }

  return potentialNames;
}

/**
 * Match OCR text against quest database
 * @param text - OCR recognized text
 * @param quests - All quests from database
 * @param threshold - Minimum match score to include (default 40)
 * @returns Sorted list of quest matches
 */
export function matchQuest(
  text: string,
  quests: QuestWithSteps[],
  threshold: number = 40
): QuestMatch[] {
  const matches: QuestMatch[] = [];

  // Extract potential quest names from OCR text
  const potentialNames = extractPotentialQuestNames(text);

  // Also check the full text for partial matches
  const fullText = text.trim();

  for (const quest of quests) {
    // Calculate similarity with quest name
    const nameSimilarity = calculateSimilarity(quest.name, fullText);

    // Check each potential extracted name
    let bestLineSimilarity = 0;
    let matchedText = '';

    for (const potentialName of potentialNames) {
      const lineSimilarity = calculateSimilarity(quest.name, potentialName);
      if (lineSimilarity > bestLineSimilarity) {
        bestLineSimilarity = lineSimilarity;
        matchedText = potentialName;
      }
    }

    // Use the best match (either from full text or individual lines)
    const bestScore = Math.max(nameSimilarity, bestLineSimilarity);

    if (bestScore >= threshold) {
      matches.push({
        quest,
        score: bestScore,
        matchedText: matchedText || quest.name,
      });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  // Return top 5 matches
  return matches.slice(0, 5);
}