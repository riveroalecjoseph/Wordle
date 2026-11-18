import type { GameMode, GameStatus, LifetimeStats } from '../engine/types';

interface StatsModalProps {
  isOpen: boolean;
  stats: LifetimeStats;
  mode: GameMode;
  status: GameStatus;
  lastGuessCount: number | null;
  targetWord: string;
  onClose: () => void;
  onShare: () => void;
  onPlayAgainPractice: () => void;
}

export function StatsModal({
  isOpen,
  stats,
  mode,
  status,
  lastGuessCount,
  targetWord,
  onClose,
  onShare,
  onPlayAgainPractice,
}: StatsModalProps) {
  if (!isOpen) return null;

  const winPercentage =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  const maxDistribution = Math.max(1, ...stats.distribution);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-modal-title"
      data-testid="stats-modal"
      onClick={onClose}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="stats-modal-title">STATISTICS</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close Statistics"
            data-testid="close-stats-btn"
          >
            ✕
          </button>
        </div>

        <div className="stats-summary" data-testid="stats-summary">
          <div className="stat-box">
            <div className="stat-value" data-testid="stat-played">
              {stats.gamesPlayed}
            </div>
            <div className="stat-label">Played</div>
          </div>
          <div className="stat-box">
            <div className="stat-value" data-testid="stat-win-pct">
              {winPercentage}
            </div>
            <div className="stat-label">Win %</div>
          </div>
          <div className="stat-box">
            <div className="stat-value" data-testid="stat-current-streak">
              {stats.currentStreak}
            </div>
            <div className="stat-label">Current Streak</div>
          </div>
          <div className="stat-box">
            <div className="stat-value" data-testid="stat-max-streak">
              {stats.maxStreak}
            </div>
            <div className="stat-label">Max Streak</div>
          </div>
        </div>

        <h3 className="distribution-title">GUESS DISTRIBUTION</h3>
        <div className="distribution-chart" data-testid="guess-distribution">
          {stats.distribution.map((count, idx) => {
            const guessNum = idx + 1;
            const widthPct = Math.max(8, Math.round((count / maxDistribution) * 100));
            const isHighlighted = status === 'WON' && lastGuessCount === guessNum && mode === 'DAILY';

            return (
              <div key={guessNum} className="dist-row">
                <span className="dist-num">{guessNum}</span>
                <div className="dist-bar-wrap">
                  <div
                    className={`dist-bar ${isHighlighted ? 'highlight' : ''}`}
                    style={{ width: `${widthPct}%` }}
                    data-testid={`dist-bar-${guessNum}`}
                  >
                    {count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {status !== 'IN_PROGRESS' && (
          <div className="round-result-summary" data-testid="round-result-summary">
            <div className="answer-reveal">
              {status === 'WON' ? 'Solved!' : `Answer: ${targetWord}`}
            </div>
            <div className="stats-actions">
              <button
                type="button"
                className="action-btn share-btn"
                onClick={onShare}
                data-testid="share-result-btn"
              >
                Share Result
              </button>
              {mode === 'PRACTICE' && (
                <button
                  type="button"
                  className="action-btn play-again-btn"
                  onClick={() => {
                    onPlayAgainPractice();
                    onClose();
                  }}
                  data-testid="modal-play-again-btn"
                >
                  Play Again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
