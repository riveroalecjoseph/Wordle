import type { GameMode } from '../engine/types';

interface HeaderProps {
  mode: GameMode;
  dayIndex: number;
  hardMode: boolean;
  onSelectMode: (mode: GameMode) => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
}

export function Header({
  mode,
  dayIndex,
  hardMode,
  onSelectMode,
  onOpenStats,
  onOpenSettings,
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="mode-switch" role="tablist" aria-label="Game Mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'DAILY'}
            className={`mode-btn ${mode === 'DAILY' ? 'active' : ''}`}
            onClick={() => onSelectMode('DAILY')}
            data-testid="mode-daily-btn"
          >
            Daily
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'PRACTICE'}
            className={`mode-btn ${mode === 'PRACTICE' ? 'active' : ''}`}
            onClick={() => onSelectMode('PRACTICE')}
            data-testid="mode-practice-btn"
          >
            Practice
          </button>
        </div>
      </div>

      <div className="header-center">
        <h1 className="app-title">WORDLE</h1>
        <span className="app-subtitle" data-testid="game-mode-badge">
          {mode === 'DAILY' ? `#${Math.abs(dayIndex) + 1}` : 'Unlimited'}
          {hardMode ? ' • Hard' : ''}
        </span>
      </div>

      <div className="header-right">
        <button
          type="button"
          className="icon-btn"
          onClick={onOpenStats}
          aria-label="Statistics"
          title="Statistics"
          data-testid="open-stats-btn"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              fill="currentColor"
              d="M16 11V3H8v6H2v12h20V11H16zm-6-6h4v14h-4V5zm-6 6h4v8H4v-8zm16 8h-4v-6h4v6z"
            />
          </svg>
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
          data-testid="open-settings-btn"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              fill="currentColor"
              d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
