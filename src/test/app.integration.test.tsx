// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { formatLocalDateKey, getDailyWordForDate } from '../engine/dictionary';
import { STORAGE_KEY } from '../storage/storage';

// Enable React act() environment
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe('End-to-End Interactive UI & Production PWA Build QA', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  function mountApp() {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<App />);
    });
  }

  function unmountApp() {
    if (root) {
      act(() => {
        root!.unmount();
      });
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  function clickKey(key: string) {
    const btn = container.querySelector(`[data-testid="key-${key}"]`) as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    act(() => {
      btn!.click();
    });
  }

  function typeWordOnVirtualKeyboard(word: string) {
    for (const ch of word.toUpperCase()) {
      clickKey(ch);
    }
  }

  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-contrast');
  });

  afterEach(() => {
    unmountApp();
    vi.useRealTimers();
  });

  it('verifies production PWA artifacts (manifest.webmanifest, _headers, sw.js, CSP meta)', () => {
    const distDir = path.resolve('dist');
    const manifestPath = path.join(distDir, 'manifest.webmanifest');
    const headersPath = path.join(distDir, '_headers');
    const swPath = path.join(distDir, 'sw.js');
    const indexPath = path.join(distDir, 'index.html');

    expect(fs.existsSync(manifestPath)).toBe(true);
    expect(fs.existsSync(headersPath)).toBe(true);
    expect(fs.existsSync(swPath)).toBe(true);
    expect(fs.existsSync(indexPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.name).toBe('Wordle Offline');
    expect(manifest.short_name).toBe('Wordle');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('portrait');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const headersText = fs.readFileSync(headersPath, 'utf8');
    expect(headersText).toContain('X-Frame-Options: DENY');
    expect(headersText).toContain('X-Content-Type-Options: nosniff');
    expect(headersText).toContain('Referrer-Policy: no-referrer');
    expect(headersText).toContain('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    expect(headersText).toContain("Content-Security-Policy: default-src 'self'");

    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    expect(indexHtml).toContain('http-equiv="Content-Security-Policy"');
    expect(indexHtml).toContain("object-src 'none'");
  });

  it('rejects short words (< 5 letters) and invalid 5-letter words with accurate toasts', () => {
    mountApp();

    // Enter 3-letter word CAT and press ENTER
    typeWordOnVirtualKeyboard('CAT');
    clickKey('ENTER');

    const toast1 = container.querySelector('[data-testid="toast-message"]');
    expect(toast1?.textContent).toBe('Not enough letters');

    // Clear with BACKSPACE
    clickKey('BACKSPACE');
    clickKey('BACKSPACE');
    clickKey('BACKSPACE');

    // Enter invalid 5-letter word ZZZZZ and press ENTER
    typeWordOnVirtualKeyboard('ZZZZZ');
    clickKey('ENTER');

    const toast2 = container.querySelector('[data-testid="toast-message"]');
    expect(toast2?.textContent).toBe('Not in word list');
  });

  it('submits valid guesses, updates tile and keyboard states, persists across reload, and toggles Settings & Modes', () => {
    mountApp();

    const todayWord = getDailyWordForDate(formatLocalDateKey(new Date())).word;
    const firstGuess = todayWord === 'CRANE' ? 'SLATE' : 'CRANE';

    typeWordOnVirtualKeyboard(firstGuess);
    clickKey('ENTER');

    // Advance past 120ms input lock timer
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Verify Row 0 tiles have evaluated states (correct, present, or absent)
    for (let c = 0; c < 5; c++) {
      const tile = container.querySelector(`[data-testid="tile-0-${c}"]`);
      expect(tile?.textContent).toBe(firstGuess[c]);
      const state = tile?.getAttribute('data-state');
      expect(['correct', 'present', 'absent']).toContain(state);
    }

    // Verify on-screen keyboard keys updated from 'unused'
    for (const ch of firstGuess) {
      const keyEl = container.querySelector(`[data-testid="key-${ch}"]`);
      expect(['correct', 'present', 'absent']).toContain(keyEl?.getAttribute('data-state'));
    }

    // Open Settings and toggle Hard Mode, High Contrast Mode, and Dark/Light Theme
    const openSettingsBtn = container.querySelector(
      '[data-testid="open-settings-btn"]'
    ) as HTMLButtonElement;
    act(() => {
      openSettingsBtn.click();
    });

    const toggleHard = container.querySelector(
      '[data-testid="toggle-hard-mode"]'
    ) as HTMLButtonElement;
    const toggleContrast = container.querySelector(
      '[data-testid="toggle-high-contrast"]'
    ) as HTMLButtonElement;
    const toggleDark = container.querySelector(
      '[data-testid="toggle-dark-mode"]'
    ) as HTMLButtonElement;

    act(() => {
      toggleHard.click();
      toggleContrast.click();
      toggleDark.click();
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-contrast')).toBe('high');

    // Close Settings
    const closeSettingsBtn = container.querySelector(
      '[data-testid="close-settings-btn"]'
    ) as HTMLButtonElement;
    act(() => {
      closeSettingsBtn.click();
    });

    expect(container.querySelector('[data-testid="game-mode-badge"]')?.textContent).toContain(
      'Hard'
    );

    // Simulate page reload mid-game by unmounting and remounting from localStorage
    unmountApp();
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    mountApp();

    // Confirm board state and settings persisted accurately after reload
    for (let c = 0; c < 5; c++) {
      const tile = container.querySelector(`[data-testid="tile-0-${c}"]`);
      expect(tile?.textContent).toBe(firstGuess[c]);
    }
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-contrast')).toBe('high');
    expect(container.querySelector('[data-testid="game-mode-badge"]')?.textContent).toContain(
      'Hard'
    );

    // Switch to Unlimited Practice Mode
    const practiceBtn = container.querySelector(
      '[data-testid="mode-practice-btn"]'
    ) as HTMLButtonElement;
    act(() => {
      practiceBtn.click();
    });

    expect(container.querySelector('[data-testid="game-mode-badge"]')?.textContent).toContain(
      'Unlimited'
    );

    // Practice board starts clean
    expect(container.querySelector('[data-testid="tile-0-0"]')?.textContent).toBe('');

    // Open Statistics modal and verify it renders
    const openStatsBtn = container.querySelector(
      '[data-testid="open-stats-btn"]'
    ) as HTMLButtonElement;
    act(() => {
      openStatsBtn.click();
    });
    expect(container.querySelector('[data-testid="stats-modal"]')).not.toBeNull();
  });

  it('allows continuing to play immediately after winning OR losing a game in Daily Mode', () => {
    mountApp();

    const todayWord = getDailyWordForDate(formatLocalDateKey(new Date())).word;

    // 1. Win the game by guessing todayWord
    typeWordOnVirtualKeyboard(todayWord);
    clickKey('ENTER');
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const gameOverBarWin = container.querySelector('[data-testid="game-over-bar"]');
    expect(gameOverBarWin).not.toBeNull();
    expect(gameOverBarWin?.textContent).toContain('Solved in 1/6!');

    const playAgainWinBtn = container.querySelector(
      '[data-testid="play-again-btn"]'
    ) as HTMLButtonElement | null;
    expect(playAgainWinBtn).not.toBeNull();

    // Click Play Again in Daily Mode to continue playing
    act(() => {
      playAgainWinBtn!.click();
    });

    // Board should reset to clean IN_PROGRESS state
    expect(container.querySelector('[data-testid="game-over-bar"]')).toBeNull();
    expect(container.querySelector('[data-testid="tile-0-0"]')?.textContent).toBe('');

    // 2. Lose the next game by submitting 6 valid wrong guesses
    const savedState = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    const nextTargetWord: string = savedState.daily.targetWord;
    expect(nextTargetWord).toBeTruthy();

    const wrongCandidates = ['CRANE', 'SLATE', 'AUDIO', 'FLOOR', 'KEBAB', 'ERASE', 'ROBOT'].filter(
      (w) => w !== nextTargetWord
    );

    for (let i = 0; i < 6; i++) {
      typeWordOnVirtualKeyboard(wrongCandidates[i]);
      clickKey('ENTER');
      act(() => {
        vi.advanceTimersByTime(200);
      });
    }

    const gameOverBarLoss = container.querySelector('[data-testid="game-over-bar"]');
    expect(gameOverBarLoss).not.toBeNull();
    expect(gameOverBarLoss?.textContent).toContain(`Word: ${nextTargetWord}`);

    const playAgainLossBtn = container.querySelector(
      '[data-testid="play-again-btn"]'
    ) as HTMLButtonElement | null;
    expect(playAgainLossBtn).not.toBeNull();

    // Click Play Again after loss to continue playing another word
    act(() => {
      playAgainLossBtn!.click();
    });

    expect(container.querySelector('[data-testid="game-over-bar"]')).toBeNull();
    expect(container.querySelector('[data-testid="tile-0-0"]')?.textContent).toBe('');
  });
});
