import { describe, expect, it } from 'vitest';
import {
  ALLOWED_GUESSES_SET,
  ANSWERS,
  formatLocalDateKey,
  getDailyWordForDate,
  getDaysSinceAnchor,
  isAllowedGuess,
  isValidFiveLetterWord,
  isValidSingleLetter,
  sanitizeSingleLetter,
} from '../engine/dictionary';
import {
  buildShareText,
  canEnableHardMode,
  computeKeyboardStates,
  evaluateGuess,
  validateHardModeGuess,
} from '../engine/evaluator';
import {
  createDefaultState,
  hasPrototypePollutionPayload,
  isValidPersistedState,
  loadAppState,
  parseAndValidateState,
  recordDailyGameResult,
  STORAGE_KEY,
} from '../storage/storage';

describe('Dictionary & Word List Requirements', () => {
  it('loads production-sized answers (~2,000-2,500) and allowedGuesses (~10,000-13,000)', () => {
    expect(ANSWERS.length).toBeGreaterThanOrEqual(2000);
    expect(ANSWERS.length).toBeLessThanOrEqual(2500);
    expect(ALLOWED_GUESSES_SET.size).toBeGreaterThanOrEqual(10000);
    expect(ALLOWED_GUESSES_SET.size).toBeLessThanOrEqual(13500);
  });

  it('ensures all answers are 5-letter uppercase A-Z words without simple -S plurals', () => {
    for (const word of ANSWERS) {
      expect(isValidFiveLetterWord(word)).toBe(true);
      expect(ALLOWED_GUESSES_SET.has(word)).toBe(true);
      if (word.endsWith('S')) {
        expect(
          word.endsWith('SS') ||
            word.endsWith('US') ||
            word.endsWith('IS') ||
            word.endsWith('OS')
        ).toBe(true);
      }
    }
  });

  it('validates known strategic guesses in O(1) time', () => {
    expect(isAllowedGuess('CRANE')).toBe(true);
    expect(isAllowedGuess('SLATE')).toBe(true);
    expect(isAllowedGuess('KEBAB')).toBe(true);
    expect(isAllowedGuess('FLOOR')).toBe(true);
    expect(isAllowedGuess('ERASE')).toBe(true);
    expect(isAllowedGuess('ZZZZZ')).toBe(false);
  });
});

describe('Two-Pass Duplicate Letter Evaluation Algorithm', () => {
  it('accurately evaluates Target ABBEY vs Guess KEBAB', () => {
    // Target: A B B E Y
    // Guess:  K E B A B
    // Index 2: B === B -> CORRECT (one B left in ABBEY)
    // Index 0: K -> ABSENT
    // Index 1: E -> PRESENT (E is at index 3 in ABBEY)
    // Index 3: A -> PRESENT (A is at index 0 in ABBEY)
    // Index 4: B -> PRESENT (second B is at index 1 in ABBEY)
    const result = evaluateGuess('KEBAB', 'ABBEY');
    expect(result.map((t) => t.state)).toEqual([
      'ABSENT',
      'PRESENT',
      'CORRECT',
      'PRESENT',
      'PRESENT',
    ]);
  });

  it('accurately evaluates Target ROBOT vs Guess FLOOR', () => {
    // Target: R O B O T (two O's at 1 and 3, one R at 0)
    // Guess:  F L O O R
    // Pass 1: Index 3: O === O -> CORRECT (one O remaining)
    // Pass 2:
    // Index 0: F -> ABSENT
    // Index 1: L -> ABSENT
    // Index 2: O -> PRESENT (consumes remaining O)
    // Index 4: R -> PRESENT (consumes R at 0)
    const result = evaluateGuess('FLOOR', 'ROBOT');
    expect(result.map((t) => t.state)).toEqual([
      'ABSENT',
      'ABSENT',
      'PRESENT',
      'CORRECT',
      'PRESENT',
    ]);
  });

  it('accurately evaluates Target SPEED vs Guess ERASE', () => {
    // Target: S P E E D (two E's at 2 and 3, one S at 0)
    // Guess:  E R A S E
    // Pass 1: No exact matches
    // Pass 2:
    // Index 0: E -> PRESENT (1st E)
    // Index 1: R -> ABSENT
    // Index 2: A -> ABSENT
    // Index 3: S -> PRESENT (S at 0)
    // Index 4: E -> PRESENT (2nd E)
    const result = evaluateGuess('ERASE', 'SPEED');
    expect(result.map((t) => t.state)).toEqual([
      'PRESENT',
      'ABSENT',
      'ABSENT',
      'PRESENT',
      'PRESENT',
    ]);
  });

  it('does not over-allocate PRESENT when guess has more duplicates than target', () => {
    // Target: R O B O T (one R) vs Guess: R A R E R (three R's)
    // Index 0: R === R -> CORRECT (0 R's left)
    // Index 2 & 4: R -> ABSENT
    const result = evaluateGuess('RARER', 'ROBOT');
    expect(result.map((t) => t.state)).toEqual([
      'CORRECT',
      'ABSENT',
      'ABSENT',
      'ABSENT',
      'ABSENT',
    ]);
  });

  it('prioritizes keyboard states CORRECT > PRESENT > ABSENT > UNUSED', () => {
    const states = computeKeyboardStates(['KEBAB', 'ABBEY'], 'ABBEY');
    expect(states['A']).toBe('CORRECT');
    expect(states['B']).toBe('CORRECT');
    expect(states['E']).toBe('CORRECT');
    expect(states['Y']).toBe('CORRECT');
    expect(states['K']).toBe('ABSENT');
    expect(states['Z']).toBe('UNUSED');
  });
});

describe('Hard Mode Validation Rules', () => {
  it('enforces column-locked CORRECT letters with exact ordinal error message', () => {
    // Target: CRANE, Previous Guess: CHARM -> C (0: CORRECT), A (2: CORRECT), R (3: PRESENT)
    const check1 = validateHardModeGuess('SLATE', ['CHARM'], 'CRANE');
    expect(check1).toEqual({
      valid: false,
      message: '1st letter must be C',
    });

    // Target: WORLD, Previous Guess: FIRST -> R at index 2 is CORRECT
    const check3 = validateHardModeGuess('PLANT', ['FIRST'], 'WORLD');
    expect(check3).toEqual({
      valid: false,
      message: '3rd letter must be R',
    });
  });

  it('enforces inclusion of revealed PRESENT letters', () => {
    // Target: CRANE, Previous Guess: AUDIO -> A is PRESENT (at index 0 in AUDIO, index 2 in CRANE)
    const check = validateHardModeGuess('SLOTH', ['AUDIO'], 'CRANE');
    expect(check).toEqual({
      valid: false,
      message: 'Guess must contain A',
    });

    // Target: SPEED, Previous Guess: ERASE -> E is PRESENT (2 instances), S is PRESENT
    const missingE = validateHardModeGuess('STORK', ['ERASE'], 'SPEED');
    expect(missingE).toEqual({
      valid: false,
      message: 'Guess must contain E',
    });
  });

  it('accepts guesses that satisfy all CORRECT column locks and PRESENT letters', () => {
    // Target: CRANE, Previous Guess: CHARM (C at 0 CORRECT, A at 2 CORRECT, R PRESENT)
    const validCheck = validateHardModeGuess('CRAFT', ['CHARM'], 'CRANE');
    expect(validCheck).toEqual({ valid: true });
  });

  it('controls when Hard Mode can be enabled mid-game', () => {
    // Allowed before guess #2 (0 or 1 guesses submitted)
    expect(canEnableHardMode([], 'CRANE')).toEqual({ valid: true });
    expect(canEnableHardMode(['AUDIO'], 'CRANE')).toEqual({ valid: true });

    // Disallowed if guess #2 violated Hard Mode constraints from guess #1
    expect(canEnableHardMode(['CHARM', 'SLATE'], 'CRANE')).toEqual({
      valid: false,
      message: 'Hard Mode can only be enabled at the start of a round',
    });

    // Allowed mid-game if existing guesses already satisfy Hard Mode
    expect(canEnableHardMode(['CHARM', 'CRAFT'], 'CRANE')).toEqual({ valid: true });
  });
});

describe('Deterministic Daily Word Indexing & Midnight Rollover', () => {
  it('computes 0 daysSinceAnchor for 2026-01-01 and increments deterministically', () => {
    expect(getDaysSinceAnchor('2026-01-01')).toBe(0);
    expect(getDaysSinceAnchor('2026-01-02')).toBe(1);
    expect(getDaysSinceAnchor('2026-01-31')).toBe(30);
    expect(getDaysSinceAnchor('2025-12-31')).toBe(-1);

    const day0 = getDailyWordForDate('2026-01-01');
    const day1 = getDailyWordForDate('2026-01-02');
    expect(day0.word).toBe(ANSWERS[0]);
    expect(day1.word).toBe(ANSWERS[1]);
    expect(day0.word).not.toBe(day1.word);
  });

  it('handles local Date objects across midnight boundary accurately', () => {
    const beforeMidnight = new Date(2026, 5, 15, 23, 59, 59);
    const afterMidnight = new Date(2026, 5, 16, 0, 0, 0);

    expect(formatLocalDateKey(beforeMidnight)).toBe('2026-06-15');
    expect(formatLocalDateKey(afterMidnight)).toBe('2026-06-16');

    const w1 = getDailyWordForDate(beforeMidnight);
    const w2 = getDailyWordForDate(afterMidnight);
    expect(w2.dayIndex - w1.dayIndex).toBe(1);
  });

  it('rolls over Daily board at midnight while preserving lifetime stats and settings', () => {
    const day1Date = new Date(2026, 0, 10, 12, 0, 0);
    const day2Date = new Date(2026, 0, 11, 0, 1, 0);

    const stateDay1 = createDefaultState(day1Date);
    const day1Word = getDailyWordForDate(day1Date).word;
    stateDay1.settings.hardMode = true;
    stateDay1.daily.guesses = [day1Word];
    stateDay1.daily.status = 'WON';
    stateDay1.stats = recordDailyGameResult(stateDay1.stats, true, 1, stateDay1.daily.dateKey);

    // Mock localStorage in memory
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    };
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: mockStorage },
      configurable: true,
      writable: true,
    });

    store[STORAGE_KEY] = JSON.stringify(stateDay1);

    const rolledState = loadAppState(day2Date);
    expect(rolledState.daily.dateKey).toBe('2026-01-11');
    expect(rolledState.daily.guesses).toEqual([]);
    expect(rolledState.daily.status).toBe('IN_PROGRESS');
    expect(rolledState.stats.gamesPlayed).toBe(1);
    expect(rolledState.stats.currentStreak).toBe(1);
    expect(rolledState.settings.hardMode).toBe(true);
  });
});

describe('Security, Input Sanitization & LocalStorage Anti-Corruption', () => {
  it('strictly rejects non-alpha characters, scripts, and malformed inputs', () => {
    expect(isValidSingleLetter('A')).toBe(true);
    expect(isValidSingleLetter('a')).toBe(false);
    expect(isValidSingleLetter('1')).toBe(false);
    expect(isValidSingleLetter('<')).toBe(false);
    expect(isValidSingleLetter('AB')).toBe(false);

    expect(sanitizeSingleLetter(' z ')).toBe('Z');
    expect(sanitizeSingleLetter('<script>')).toBe(null);
    expect(sanitizeSingleLetter('5')).toBe(null);
    expect(sanitizeSingleLetter(null)).toBe(null);

    expect(isValidFiveLetterWord('CRANE')).toBe(true);
    expect(isValidFiveLetterWord('crane')).toBe(false);
    expect(isValidFiveLetterWord('CRAN!')).toBe(false);
    expect(isValidFiveLetterWord('<SVG>')).toBe(false);
  });

  it('rejects prototype pollution payloads (__proto__, constructor, prototype)', () => {
    const protoPayload =
      '{"version":1,"__proto__":{"polluted":true},"settings":{"hardMode":false,"highContrast":false,"darkMode":true}}';
    const constructorPayload =
      '{"version":1,"constructor":{"prototype":{"polluted":true}}}';
    const nestedProtoPayload =
      '{"version":1,"settings":{"hardMode":false,"highContrast":false,"darkMode":true,"prototype":{}}}';

    expect(hasPrototypePollutionPayload(protoPayload)).toBe(true);
    expect(parseAndValidateState(protoPayload)).toBeNull();
    expect(parseAndValidateState(constructorPayload)).toBeNull();
    expect(parseAndValidateState(nestedProtoPayload)).toBeNull();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('rejects malformed JSON and tampered localStorage schemas and recovers cleanly', () => {
    expect(parseAndValidateState('{bad json')).toBeNull();
    expect(parseAndValidateState('')).toBeNull();
    expect(parseAndValidateState(null)).toBeNull();

    const valid = createDefaultState(new Date(2026, 0, 5));
    expect(isValidPersistedState(valid)).toBe(true);

    // Tamper with stats (gamesWon > gamesPlayed)
    const tamperedStats = structuredClone(valid);
    tamperedStats.stats.gamesPlayed = 1;
    tamperedStats.stats.gamesWon = 5;
    expect(parseAndValidateState(JSON.stringify(tamperedStats))).toBeNull();

    // Tamper with board guesses (inject XSS string into guesses array)
    const tamperedGuesses = structuredClone(valid);
    tamperedGuesses.daily.guesses = ['<img onerror=alert(1)>'];
    expect(parseAndValidateState(JSON.stringify(tamperedGuesses))).toBeNull();

    // Tamper with board status (claim WON with 0 guesses)
    const tamperedStatus = structuredClone(valid);
    tamperedStatus.daily.status = 'WON';
    expect(parseAndValidateState(JSON.stringify(tamperedStatus))).toBeNull();
  });

  it('generates accurate offline emoji share text', () => {
    const share = buildShareText({
      mode: 'DAILY',
      dayIndex: 0,
      guesses: ['KEBAB', 'ABBEY'],
      target: 'ABBEY',
      status: 'WON',
      hardMode: true,
      highContrast: false,
      darkMode: true,
    });
    expect(share).toContain('Wordle Offline #1 2/6*');
    expect(share).toContain('⬛🟨🟩🟨🟨');
    expect(share).toContain('🟩🟩🟩🟩🟩');
  });
});
