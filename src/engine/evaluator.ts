import { isValidFiveLetterWord } from './dictionary';
import type { EvaluatedTile, HardModeResult, LetterState } from './types';

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'] as const;

const STATE_PRIORITY: Record<LetterState, number> = {
  UNUSED: 0,
  ABSENT: 1,
  PRESENT: 2,
  CORRECT: 3,
};

/**
 * Two-Pass Duplicate Letter Evaluation Algorithm (Exact NYT Wordle Rules)
 */
export function evaluateGuess(guess: string, target: string): EvaluatedTile[] {
  const normalizedGuess = guess.toUpperCase();
  const normalizedTarget = target.toUpperCase();

  if (!isValidFiveLetterWord(normalizedGuess) || !isValidFiveLetterWord(normalizedTarget)) {
    throw new Error('Both guess and target must be 5-letter uppercase A-Z words');
  }

  const states: LetterState[] = ['ABSENT', 'ABSENT', 'ABSENT', 'ABSENT', 'ABSENT'];
  const remainingCounts: Record<string, number> = Object.create(null);

  for (let i = 0; i < 5; i++) {
    const ch = normalizedTarget[i];
    remainingCounts[ch] = (remainingCounts[ch] ?? 0) + 1;
  }

  // Pass 1: Exact matches (CORRECT)
  for (let i = 0; i < 5; i++) {
    if (normalizedGuess[i] === normalizedTarget[i]) {
      states[i] = 'CORRECT';
      remainingCounts[normalizedGuess[i]] -= 1;
    }
  }

  // Pass 2: Misplaced (PRESENT) & Absent (ABSENT)
  for (let i = 0; i < 5; i++) {
    if (states[i] === 'CORRECT') continue;
    const ch = normalizedGuess[i];
    if ((remainingCounts[ch] ?? 0) > 0) {
      states[i] = 'PRESENT';
      remainingCounts[ch] -= 1;
    } else {
      states[i] = 'ABSENT';
    }
  }

  return Array.from({ length: 5 }, (_, i) => ({
    letter: normalizedGuess[i],
    state: states[i],
  }));
}

/**
 * Computes the highest-priority state discovered so far for each letter A-Z
 * Priority: CORRECT > PRESENT > ABSENT > UNUSED
 */
export function computeKeyboardStates(
  guesses: readonly string[],
  target: string
): Record<string, LetterState> {
  const keyMap: Record<string, LetterState> = Object.create(null);
  for (let code = 65; code <= 90; code++) {
    keyMap[String.fromCharCode(code)] = 'UNUSED';
  }

  if (!isValidFiveLetterWord(target)) {
    return keyMap;
  }

  for (const guess of guesses) {
    if (!isValidFiveLetterWord(guess)) continue;
    const evaluated = evaluateGuess(guess, target);
    for (const { letter, state } of evaluated) {
      const current = keyMap[letter] ?? 'UNUSED';
      if (STATE_PRIORITY[state] > STATE_PRIORITY[current]) {
        keyMap[letter] = state;
      }
    }
  }

  return keyMap;
}

/**
 * Validates a candidate guess against Hard Mode constraints accumulated from previous guesses.
 * 1. All revealed CORRECT letters must remain in their exact column index (0..4).
 * 2. All revealed PRESENT letters (including required minimum counts) must be included.
 */
export function validateHardModeGuess(
  candidateGuess: string,
  previousGuesses: readonly string[],
  target: string
): HardModeResult {
  const guess = candidateGuess.toUpperCase();
  if (!isValidFiveLetterWord(guess)) {
    return { valid: false, message: 'Not enough letters' };
  }

  if (previousGuesses.length === 0) {
    return { valid: true };
  }

  const requiredColumns: (string | null)[] = [null, null, null, null, null];
  const minLetterCounts: Record<string, number> = Object.create(null);
  const requiredLettersOrder: string[] = [];

  for (const prev of previousGuesses) {
    if (!isValidFiveLetterWord(prev)) continue;
    const evaluated = evaluateGuess(prev, target);
    const prevPositiveCounts: Record<string, number> = Object.create(null);

    for (let i = 0; i < 5; i++) {
      const { letter, state } = evaluated[i];
      if (state === 'CORRECT') {
        requiredColumns[i] = letter;
        prevPositiveCounts[letter] = (prevPositiveCounts[letter] ?? 0) + 1;
      } else if (state === 'PRESENT') {
        prevPositiveCounts[letter] = (prevPositiveCounts[letter] ?? 0) + 1;
        if (!requiredLettersOrder.includes(letter)) {
          requiredLettersOrder.push(letter);
        }
      }
    }

    for (const letter of Object.keys(prevPositiveCounts)) {
      const count = prevPositiveCounts[letter];
      if (count > (minLetterCounts[letter] ?? 0)) {
        minLetterCounts[letter] = count;
      }
      if (!requiredLettersOrder.includes(letter)) {
        requiredLettersOrder.push(letter);
      }
    }
  }

  // Check column-locked CORRECT letters first in order 1st..5th
  for (let i = 0; i < 5; i++) {
    const req = requiredColumns[i];
    if (req !== null && guess[i] !== req) {
      return {
        valid: false,
        message: `${ORDINALS[i]} letter must be ${req}`,
      };
    }
  }

  // Count letters in candidate guess
  const candidateCounts: Record<string, number> = Object.create(null);
  for (let i = 0; i < 5; i++) {
    const ch = guess[i];
    candidateCounts[ch] = (candidateCounts[ch] ?? 0) + 1;
  }

  // Check required PRESENT letters
  for (const letter of requiredLettersOrder) {
    const required = minLetterCounts[letter] ?? 0;
    const actual = candidateCounts[letter] ?? 0;
    if (actual < required) {
      return {
        valid: false,
        message: `Guess must contain ${letter}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Checks if Hard Mode can be enabled at the current point in a game.
 * Can be enabled before guess #2 (<= 1 submitted guess), or mid-game if all
 * existing guesses already satisfy Hard Mode rules.
 */
export function canEnableHardMode(
  guesses: readonly string[],
  target: string
): HardModeResult {
  if (guesses.length <= 1) {
    return { valid: true };
  }
  for (let i = 1; i < guesses.length; i++) {
    const check = validateHardModeGuess(guesses[i], guesses.slice(0, i), target);
    if (!check.valid) {
      return {
        valid: false,
        message: 'Hard Mode can only be enabled at the start of a round',
      };
    }
  }
  return { valid: true };
}

/**
 * Builds the offline clipboard share text with emoji grid
 */
export function buildShareText(params: {
  mode: 'DAILY' | 'PRACTICE';
  dayIndex: number;
  guesses: readonly string[];
  target: string;
  status: 'IN_PROGRESS' | 'WON' | 'LOST';
  hardMode: boolean;
  highContrast: boolean;
  darkMode: boolean;
}): string {
  const { mode, dayIndex, guesses, target, status, hardMode, highContrast, darkMode } = params;
  const label = mode === 'DAILY' ? `Wordle Offline #${Math.abs(dayIndex) + 1}` : 'Wordle Offline (Practice)';
  const scorePart = status === 'WON' ? `${guesses.length}/6` : 'X/6';
  const hardSuffix = hardMode ? '*' : '';

  const correctEmoji = highContrast ? '🟧' : '🟩';
  const presentEmoji = highContrast ? '🟦' : '🟨';
  const absentEmoji = darkMode ? '⬛' : '⬜';

  const rows = guesses.map((g) => {
    const evalRow = evaluateGuess(g, target);
    return evalRow
      .map((tile) => {
        if (tile.state === 'CORRECT') return correctEmoji;
        if (tile.state === 'PRESENT') return presentEmoji;
        return absentEmoji;
      })
      .join('');
  });

  return `${label} ${scorePart}${hardSuffix}\n\n${rows.join('\n')}`;
}
