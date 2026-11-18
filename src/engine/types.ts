export type LetterState = 'CORRECT' | 'PRESENT' | 'ABSENT' | 'UNUSED';

export type GameMode = 'DAILY' | 'PRACTICE';

export type GameStatus = 'IN_PROGRESS' | 'WON' | 'LOST';

export interface EvaluatedTile {
  letter: string;
  state: LetterState;
}

export interface HardModeViolation {
  valid: false;
  message: string;
}

export interface HardModeSuccess {
  valid: true;
}

export type HardModeResult = HardModeSuccess | HardModeViolation;

export interface AppSettings {
  hardMode: boolean;
  highContrast: boolean;
  darkMode: boolean;
}

export interface DailyBoardState {
  dateKey: string;
  dayIndex: number;
  guesses: string[];
  status: GameStatus;
  targetWord?: string;
}

export interface PracticeBoardState {
  targetWord: string;
  guesses: string[];
  status: GameStatus;
}

export type GuessDistribution = [number, number, number, number, number, number];

export interface LifetimeStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastCompletedDate: string | null;
  distribution: GuessDistribution;
}

export interface PersistedAppState {
  version: 1;
  settings: AppSettings;
  daily: DailyBoardState;
  practice: PracticeBoardState;
  stats: LifetimeStats;
}
