import answersData from '../data/answers.json';
import allowedGuessesData from '../data/allowedGuesses.json';

const SINGLE_LETTER_REGEX = /^[A-Z]$/;
const FIVE_LETTER_WORD_REGEX = /^[A-Z]{5}$/;
const DATE_KEY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export const ANSWERS: readonly string[] = answersData;

// Load allowedGuesses (plus answers) into an in-memory Set<string> on initialization for O(1) lookup
const allowedSet = new Set<string>(allowedGuessesData);
for (const ans of ANSWERS) {
  allowedSet.add(ans);
}
export const ALLOWED_GUESSES_SET: ReadonlySet<string> = allowedSet;

export function isValidSingleLetter(input: unknown): input is string {
  return typeof input === 'string' && SINGLE_LETTER_REGEX.test(input);
}

export function isValidFiveLetterWord(input: unknown): input is string {
  return typeof input === 'string' && FIVE_LETTER_WORD_REGEX.test(input);
}

export function sanitizeSingleLetter(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const upper = input.trim().toUpperCase();
  return SINGLE_LETTER_REGEX.test(upper) ? upper : null;
}

export function isAllowedGuess(word: string): boolean {
  if (!isValidFiveLetterWord(word)) return false;
  return ALLOWED_GUESSES_SET.has(word);
}

export function formatLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DATE_KEY_REGEX.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1970 || year > 9999) {
    return false;
  }
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

const ANCHOR_UTC_MS = Date.UTC(2026, 0, 1); // 2026-01-01
const MS_PER_DAY = 86_400_000;

export function getDaysSinceAnchor(dateOrKey: Date | string = new Date()): number {
  const dateKey = typeof dateOrKey === 'string' ? dateOrKey : formatLocalDateKey(dateOrKey);
  const match = DATE_KEY_REGEX.exec(dateKey);
  if (!match) {
    throw new Error(`Invalid date key format: ${dateKey}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const targetUtcMs = Date.UTC(year, month - 1, day);
  return Math.round((targetUtcMs - ANCHOR_UTC_MS) / MS_PER_DAY);
}

export function getDailyWordForDate(
  dateOrKey: Date | string = new Date(),
  answerList: readonly string[] = ANSWERS
): { dateKey: string; dayIndex: number; word: string } {
  if (answerList.length === 0) {
    throw new Error('Answer list cannot be empty');
  }
  const dateKey = typeof dateOrKey === 'string' ? dateOrKey : formatLocalDateKey(dateOrKey);
  const dayIndex = getDaysSinceAnchor(dateKey);
  const index = Math.abs(dayIndex) % answerList.length;
  return {
    dateKey,
    dayIndex,
    word: answerList[index],
  };
}

export function getRandomPracticeWord(excludeWord?: string): string {
  if (ANSWERS.length === 0) return 'CRANE';
  if (ANSWERS.length === 1) return ANSWERS[0];
  let candidate = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
  if (excludeWord && candidate === excludeWord) {
    const idx = ANSWERS.indexOf(candidate);
    candidate = ANSWERS[(idx + 1) % ANSWERS.length];
  }
  return candidate;
}
