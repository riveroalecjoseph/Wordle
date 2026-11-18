import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Board } from './components/Board';
import { Header } from './components/Header';
import { Keyboard } from './components/Keyboard';
import { SettingsModal } from './components/SettingsModal';
import { StatsModal } from './components/StatsModal';
import { Toast } from './components/Toast';
import {
  formatLocalDateKey,
  getDailyWordForDate,
  getRandomPracticeWord,
  isAllowedGuess,
  isValidFiveLetterWord,
  sanitizeSingleLetter,
} from './engine/dictionary';
import {
  buildShareText,
  canEnableHardMode,
  computeKeyboardStates,
  validateHardModeGuess,
} from './engine/evaluator';
import type { GameMode, PersistedAppState } from './engine/types';
import {
  loadAppState,
  recordDailyGameResult,
  saveAppState,
} from './storage/storage';

const WIN_MESSAGES = ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'] as const;

export function App() {
  const [appState, setAppState] = useState<PersistedAppState>(() => loadAppState());
  const [mode, setMode] = useState<GameMode>('DAILY');
  const [currentInput, setCurrentInput] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shakeRow, setShakeRow] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);

  const isSubmittingRef = useRef<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string, durationMs = 1800) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, durationMs);
  }, []);

  const triggerShake = useCallback(() => {
    if (shakeTimerRef.current !== null) {
      window.clearTimeout(shakeTimerRef.current);
    }
    setShakeRow(true);
    shakeTimerRef.current = window.setTimeout(() => {
      setShakeRow(false);
      shakeTimerRef.current = null;
    }, 450);
  }, []);

  // Persist state on change
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  // Apply theme & high contrast attributes on document root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', appState.settings.darkMode ? 'dark' : 'light');
    root.setAttribute(
      'data-contrast',
      appState.settings.highContrast ? 'high' : 'normal'
    );
  }, [appState.settings.darkMode, appState.settings.highContrast]);

  // Check for local midnight rollover periodically and on window focus
  useEffect(() => {
    const checkMidnightRollover = () => {
      const todayKey = formatLocalDateKey(new Date());
      setAppState((prev) => {
        if (prev.daily.dateKey === todayKey) return prev;
        const todayInfo = getDailyWordForDate(todayKey);
        return {
          ...prev,
          daily: {
            dateKey: todayInfo.dateKey,
            dayIndex: todayInfo.dayIndex,
            guesses: [],
            status: 'IN_PROGRESS',
          },
        };
      });
    };

    const interval = window.setInterval(checkMidnightRollover, 30_000);
    window.addEventListener('focus', checkMidnightRollover);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', checkMidnightRollover);
    };
  }, []);

  const dailyTargetWord = useMemo(
    () => appState.daily.targetWord ?? getDailyWordForDate(appState.daily.dateKey).word,
    [appState.daily.dateKey, appState.daily.targetWord]
  );

  const activeBoard = mode === 'DAILY' ? appState.daily : appState.practice;
  const activeTargetWord = mode === 'DAILY' ? dailyTargetWord : appState.practice.targetWord;

  const keyStates = useMemo(
    () => computeKeyboardStates(activeBoard.guesses, activeTargetWord),
    [activeBoard.guesses, activeTargetWord]
  );

  const handleSelectMode = useCallback((nextMode: GameMode) => {
    if (isSubmittingRef.current) return;
    setMode(nextMode);
    setCurrentInput('');
    setShakeRow(false);
  }, []);

  const handlePlayAgain = useCallback(() => {
    if (isSubmittingRef.current) return;
    if (mode === 'DAILY') {
      setAppState((prev) => {
        const currentDailyWord =
          prev.daily.targetWord ?? getDailyWordForDate(prev.daily.dateKey).word;
        return {
          ...prev,
          daily: {
            dateKey: prev.daily.dateKey,
            dayIndex: prev.daily.dayIndex,
            targetWord: getRandomPracticeWord(currentDailyWord),
            guesses: [],
            status: 'IN_PROGRESS',
          },
        };
      });
      setCurrentInput('');
      setShakeRow(false);
      showToast('New word ready');
    } else {
      setAppState((prev) => ({
        ...prev,
        practice: {
          targetWord: getRandomPracticeWord(prev.practice.targetWord),
          guesses: [],
          status: 'IN_PROGRESS',
        },
      }));
      setCurrentInput('');
      setShakeRow(false);
      showToast('New practice word ready');
    }
  }, [mode, showToast]);

  const submitCurrentGuess = useCallback(() => {
    if (isSubmittingRef.current || activeBoard.status !== 'IN_PROGRESS') {
      return;
    }

    if (currentInput.length < 5) {
      triggerShake();
      showToast('Not enough letters');
      return;
    }

    if (!isValidFiveLetterWord(currentInput) || !isAllowedGuess(currentInput)) {
      triggerShake();
      showToast('Not in word list');
      return;
    }

    if (appState.settings.hardMode) {
      const hardCheck = validateHardModeGuess(
        currentInput,
        activeBoard.guesses,
        activeTargetWord
      );
      if (!hardCheck.valid) {
        triggerShake();
        showToast(hardCheck.message);
        return;
      }
    }

    // Lock keyboard input briefly during row submission/evaluation
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const submittedWord = currentInput;
    const nextGuesses = [...activeBoard.guesses, submittedWord];
    const isWin = submittedWord === activeTargetWord;
    const isLoss = !isWin && nextGuesses.length >= 6;
    const nextStatus = isWin ? 'WON' : isLoss ? 'LOST' : 'IN_PROGRESS';

    setAppState((prev) => {
      if (mode === 'DAILY') {
        const updatedStats =
          nextStatus !== 'IN_PROGRESS'
            ? recordDailyGameResult(
                prev.stats,
                isWin,
                nextGuesses.length,
                prev.daily.dateKey
              )
            : prev.stats;

        return {
          ...prev,
          daily: {
            ...prev.daily,
            guesses: nextGuesses,
            status: nextStatus,
          },
          stats: updatedStats,
        };
      } else {
        return {
          ...prev,
          practice: {
            ...prev.practice,
            guesses: nextGuesses,
            status: nextStatus,
          },
        };
      }
    });

    setCurrentInput('');

    if (isWin) {
      const msg = WIN_MESSAGES[Math.min(nextGuesses.length - 1, WIN_MESSAGES.length - 1)];
      showToast(msg, 2200);
    } else if (isLoss) {
      showToast(activeTargetWord, 3000);
    }

    window.setTimeout(() => {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }, 120);
  }, [
    activeBoard.guesses,
    activeBoard.status,
    activeTargetWord,
    appState.settings.hardMode,
    currentInput,
    mode,
    showToast,
    triggerShake,
  ]);

  const handleKeyInput = useCallback(
    (rawKey: string) => {
      if (isSubmittingRef.current) {
        return;
      }

      if (activeBoard.status !== 'IN_PROGRESS') {
        if (rawKey === 'ENTER') {
          handlePlayAgain();
        }
        return;
      }

      if (rawKey === 'ENTER') {
        submitCurrentGuess();
        return;
      }

      if (rawKey === 'BACKSPACE') {
        setCurrentInput((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
        return;
      }

      const cleanLetter = sanitizeSingleLetter(rawKey);
      if (cleanLetter !== null) {
        setCurrentInput((prev) => (prev.length < 5 ? prev + cleanLetter : prev));
      }
    },
    [activeBoard.status, handlePlayAgain, submitCurrentGuess]
  );

  // Physical keyboard listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape') {
        setIsSettingsOpen(false);
        setIsStatsOpen(false);
        return;
      }

      if (isSettingsOpen || isStatsOpen) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleKeyInput('ENTER');
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyInput('BACKSPACE');
        return;
      }

      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleKeyInput(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKeyInput, isSettingsOpen, isStatsOpen]);

  const handleToggleHardMode = useCallback(() => {
    setAppState((prev) => {
      const nextHard = !prev.settings.hardMode;
      if (nextHard && activeBoard.status === 'IN_PROGRESS') {
        const check = canEnableHardMode(activeBoard.guesses, activeTargetWord);
        if (!check.valid) {
          showToast(check.message);
          return prev;
        }
      }
      return {
        ...prev,
        settings: {
          ...prev.settings,
          hardMode: nextHard,
        },
      };
    });
  }, [activeBoard.guesses, activeBoard.status, activeTargetWord, showToast]);

  const handleToggleHighContrast = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        highContrast: !prev.settings.highContrast,
      },
    }));
  }, []);

  const handleToggleDarkMode = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        darkMode: !prev.settings.darkMode,
      },
    }));
  }, []);

  const handleShareResult = useCallback(async () => {
    if (activeBoard.status === 'IN_PROGRESS') return;
    const text = buildShareText({
      mode,
      dayIndex: appState.daily.dayIndex,
      guesses: activeBoard.guesses,
      target: activeTargetWord,
      status: activeBoard.status,
      hardMode: appState.settings.hardMode,
      highContrast: appState.settings.highContrast,
      darkMode: appState.settings.darkMode,
    });

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard');
        return;
      }
    } catch {
      // Fallback below
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'true');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied to clipboard');
    } catch {
      showToast('Unable to copy');
    }
  }, [
    activeBoard.guesses,
    activeBoard.status,
    activeTargetWord,
    appState.daily.dayIndex,
    appState.settings.darkMode,
    appState.settings.hardMode,
    appState.settings.highContrast,
    mode,
    showToast,
  ]);

  return (
    <div className="app-shell">
      <Header
        mode={mode}
        dayIndex={appState.daily.dayIndex}
        hardMode={appState.settings.hardMode}
        onSelectMode={handleSelectMode}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <Toast message={toastMessage} />

      <main className="game-main">
        <Board
          guesses={activeBoard.guesses}
          currentInput={currentInput}
          targetWord={activeTargetWord}
          status={activeBoard.status}
          shakeRow={shakeRow}
        />

        {activeBoard.status !== 'IN_PROGRESS' && (
          <div className="game-over-bar" data-testid="game-over-bar">
            <span className="game-over-status">
              {activeBoard.status === 'WON'
                ? `Solved in ${activeBoard.guesses.length}/6!`
                : `Word: ${activeTargetWord}`}
            </span>
            <div className="game-over-actions">
              <button
                type="button"
                className="inline-action-btn play-again"
                onClick={handlePlayAgain}
                data-testid="play-again-btn"
              >
                Play Again
              </button>
              <button
                type="button"
                className="inline-action-btn share"
                onClick={handleShareResult}
                data-testid="inline-share-btn"
              >
                Share Result
              </button>
            </div>
          </div>
        )}

        <Keyboard
          keyStates={keyStates}
          disabled={isSubmitting || activeBoard.status !== 'IN_PROGRESS'}
          onKeyPress={handleKeyInput}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={appState.settings}
        onClose={() => setIsSettingsOpen(false)}
        onToggleHardMode={handleToggleHardMode}
        onToggleHighContrast={handleToggleHighContrast}
        onToggleDarkMode={handleToggleDarkMode}
      />

      <StatsModal
        isOpen={isStatsOpen}
        stats={appState.stats}
        mode={mode}
        status={activeBoard.status}
        lastGuessCount={
          activeBoard.status === 'WON' ? activeBoard.guesses.length : null
        }
        targetWord={activeTargetWord}
        onClose={() => setIsStatsOpen(false)}
        onShare={handleShareResult}
        onPlayAgain={handlePlayAgain}
      />
    </div>
  );
}
