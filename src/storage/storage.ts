import {
  formatLocalDateKey,
  getDailyWordForDate,
  getDaysSinceAnchor,
  getRandomPracticeWord,
  isAllowedGuess,
  isValidDateKey,
  isValidFiveLetterWord,
} from '../engine/dictionary';
import type {
  AppSettings,
  DailyBoardState,
  GameStatus,
  GuessDistribution,
  LifetimeStats,
  PersistedAppState,
  PracticeBoardState,
} from '../engine/types';

export const STORAGE_KEY = 'wordle_offline_state_v1';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Inspects a raw JSON string and parsed value to ensure no prototype pollution keys exist.
 */
export function hasPrototypePollutionPayload(rawJson: string): boolean {
  // Detect explicit own-property keys in raw JSON text
  if (/"(?:__proto__|constructor|prototype)"\s*:/.test(rawJson)) {
    return true;
  }
  return false;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) {
    return false;
  }
  const proto = Object.getPrototypeOf(val);
  if (proto !== Object.prototype && proto !== null) {
    return false;
  }
  for (const key of Object.getOwnPropertyNames(val)) {
    if (FORBIDDEN_KEYS.has(key)) {
      return false;
    }
  }
  return true;
}

function hasExactKeys(obj: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  const keys = Object.keys(obj);
  if (keys.length !== allowedKeys.length) return false;
  for (const k of allowedKeys) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) return false;
  }
  return true;
}

function isValidStatus(val: unknown): val is GameStatus {
  return val === 'IN_PROGRESS' || val === 'WON' || val === 'LOST';
}

function isValidGuessesArray(val: unknown): val is string[] {
  if (!Array.isArray(val) || val.length > 6) return false;
  for (const item of val) {
    if (!isValidFiveLetterWord(item) || !isAllowedGuess(item)) {
      return false;
    }
  }
  return true;
}

function isConsistentBoardStatus(
  guesses: readonly string[],
  status: GameStatus,
  targetWord: string
): boolean {
  const wonIndex = guesses.indexOf(targetWord);
  if (status === 'WON') {
    // Must have guessed targetWord on the last guess
    return guesses.length >= 1 && guesses.length <= 6 && wonIndex === guesses.length - 1;
  }
  if (status === 'LOST') {
    return guesses.length === 6 && wonIndex === -1;
  }
  // IN_PROGRESS
  return guesses.length < 6 && wonIndex === -1;
}

function validateSettings(val: unknown): val is AppSettings {
  if (!isPlainObject(val)) return false;
  if (!hasExactKeys(val, ['hardMode', 'highContrast', 'darkMode'])) return false;
  return (
    typeof val.hardMode === 'boolean' &&
    typeof val.highContrast === 'boolean' &&
    typeof val.darkMode === 'boolean'
  );
}

function validateDailyBoard(val: unknown): val is DailyBoardState {
  if (!isPlainObject(val)) return false;
  const hasBaseKeys = hasExactKeys(val, ['dateKey', 'dayIndex', 'guesses', 'status']);
  const hasExtendedKeys = hasExactKeys(val, [
    'dateKey',
    'dayIndex',
    'guesses',
    'status',
    'targetWord',
  ]);
  if (!hasBaseKeys && !hasExtendedKeys) return false;
  if (!isValidDateKey(val.dateKey)) return false;
  if (typeof val.dayIndex !== 'number' || !Number.isInteger(val.dayIndex)) return false;
  const expectedDayIndex = getDaysSinceAnchor(val.dateKey);
  if (val.dayIndex !== expectedDayIndex) return false;
  if (!isValidGuessesArray(val.guesses)) return false;
  if (!isValidStatus(val.status)) return false;
  let targetWord = getDailyWordForDate(val.dateKey).word;
  if (hasExtendedKeys) {
    if (!isValidFiveLetterWord(val.targetWord) || !isAllowedGuess(val.targetWord)) {
      return false;
    }
    targetWord = val.targetWord;
  }
  return isConsistentBoardStatus(val.guesses, val.status, targetWord);
}

function validatePracticeBoard(val: unknown): val is PracticeBoardState {
  if (!isPlainObject(val)) return false;
  if (!hasExactKeys(val, ['targetWord', 'guesses', 'status'])) return false;
  if (!isValidFiveLetterWord(val.targetWord) || !isAllowedGuess(val.targetWord)) return false;
  if (!isValidGuessesArray(val.guesses)) return false;
  if (!isValidStatus(val.status)) return false;
  return isConsistentBoardStatus(val.guesses, val.status, val.targetWord);
}

function isNonNegativeInt(val: unknown, max = 1_000_000): val is number {
  return typeof val === 'number' && Number.isInteger(val) && val >= 0 && val <= max;
}

function validateStats(val: unknown): val is LifetimeStats {
  if (!isPlainObject(val)) return false;
  if (
    !hasExactKeys(val, [
      'gamesPlayed',
      'gamesWon',
      'currentStreak',
      'maxStreak',
      'lastCompletedDate',
      'distribution',
    ])
  ) {
    return false;
  }
  if (!isNonNegativeInt(val.gamesPlayed)) return false;
  if (!isNonNegativeInt(val.gamesWon) || val.gamesWon > val.gamesPlayed) return false;
  if (!isNonNegativeInt(val.currentStreak) || val.currentStreak > val.gamesWon) return false;
  if (!isNonNegativeInt(val.maxStreak) || val.maxStreak > val.gamesWon) return false;
  if (val.currentStreak > val.maxStreak) return false;
  if (val.lastCompletedDate !== null && !isValidDateKey(val.lastCompletedDate)) return false;
  if (!Array.isArray(val.distribution) || val.distribution.length !== 6) return false;
  let distSum = 0;
  for (const count of val.distribution) {
    if (!isNonNegativeInt(count)) return false;
    distSum += count;
  }
  if (distSum !== val.gamesWon) return false;
  return true;
}

export function isValidPersistedState(val: unknown): val is PersistedAppState {
  if (!isPlainObject(val)) return false;
  if (!hasExactKeys(val, ['version', 'settings', 'daily', 'practice', 'stats'])) return false;
  if (val.version !== 1) return false;
  if (!validateSettings(val.settings)) return false;
  if (!validateDailyBoard(val.daily)) return false;
  if (!validatePracticeBoard(val.practice)) return false;
  if (!validateStats(val.stats)) return false;
  return true;
}

export function createDefaultState(now: Date = new Date()): PersistedAppState {
  const { dateKey, dayIndex } = getDailyWordForDate(now);
  return {
    version: 1,
    settings: {
      hardMode: false,
      highContrast: false,
      darkMode: true,
    },
    daily: {
      dateKey,
      dayIndex,
      guesses: [],
      status: 'IN_PROGRESS',
    },
    practice: {
      targetWord: getRandomPracticeWord(),
      guesses: [],
      status: 'IN_PROGRESS',
    },
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      lastCompletedDate: null,
      distribution: [0, 0, 0, 0, 0, 0],
    },
  };
}

/**
 * Safely parses and validates a serialized state JSON string.
 * Returns null if malformed, tampered, or contains prototype pollution keys.
 */
export function parseAndValidateState(rawJson: string | null): PersistedAppState | null {
  if (typeof rawJson !== 'string' || rawJson.trim().length === 0) {
    return null;
  }
  if (rawJson.length > 100_000) {
    return null;
  }
  if (hasPrototypePollutionPayload(rawJson)) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(rawJson, (key, value) => {
      if (FORBIDDEN_KEYS.has(key)) {
        throw new Error(`Forbidden prototype pollution key: ${key}`);
      }
      return value;
    });
    if (!isValidPersistedState(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Loads state from localStorage with midnight rollover check and fallback to default state.
 */
export function loadAppState(now: Date = new Date()): PersistedAppState {
  const fallback = createDefaultState(now);
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return fallback;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const validated = parseAndValidateState(raw);
    if (!validated) {
      if (raw !== null) {
        // Safely overwrite corrupted/tampered storage with clean default state
        saveAppState(fallback);
      }
      return fallback;
    }

    // Check if local calendar date rolled over past midnight
    const todayKey = formatLocalDateKey(now);
    if (validated.daily.dateKey !== todayKey) {
      const todayInfo = getDailyWordForDate(todayKey);
      const rolledOver: PersistedAppState = {
        ...validated,
        daily: {
          dateKey: todayInfo.dateKey,
          dayIndex: todayInfo.dayIndex,
          guesses: [],
          status: 'IN_PROGRESS',
        },
      };
      saveAppState(rolledOver);
      return rolledOver;
    }

    return validated;
  } catch {
    return fallback;
  }
}

/**
 * Safely writes validated state to localStorage wrapped in try/catch.
 */
export function saveAppState(state: PersistedAppState): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    if (!isValidPersistedState(state)) {
      return false;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/**
 * Updates lifetime statistics upon game completion (supports continuous play on the same day).
 */
export function recordDailyGameResult(
  prevStats: LifetimeStats,
  won: boolean,
  guessCount: number,
  completedDateKey: string
): LifetimeStats {
  const gamesPlayed = prevStats.gamesPlayed + 1;
  const gamesWon = won ? prevStats.gamesWon + 1 : prevStats.gamesWon;

  let canContinueStreak = false;
  if (prevStats.lastCompletedDate !== null) {
    const prevIdx = getDaysSinceAnchor(prevStats.lastCompletedDate);
    const currIdx = getDaysSinceAnchor(completedDateKey);
    const dayDiff = currIdx - prevIdx;
    // Continues streak if played on the same day (0) or consecutive next day (1)
    canContinueStreak = dayDiff === 0 || dayDiff === 1;
  }

  const currentStreak = won ? (canContinueStreak ? prevStats.currentStreak + 1 : 1) : 0;
  const maxStreak = Math.max(prevStats.maxStreak, currentStreak);

  const distribution: GuessDistribution = [...prevStats.distribution] as GuessDistribution;
  if (won && guessCount >= 1 && guessCount <= 6) {
    distribution[guessCount - 1] += 1;
  }

  return {
    gamesPlayed,
    gamesWon,
    currentStreak,
    maxStreak,
    lastCompletedDate: completedDateKey,
    distribution,
  };
}
