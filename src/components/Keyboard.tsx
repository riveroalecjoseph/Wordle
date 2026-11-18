import type { LetterState } from '../engine/types';

interface KeyboardProps {
  keyStates: Record<string, LetterState>;
  disabled: boolean;
  onKeyPress: (key: string) => void;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
] as const;

export function Keyboard({ keyStates, disabled, onKeyPress }: KeyboardProps) {
  return (
    <div className="keyboard" role="group" aria-label="On-screen Keyboard" data-testid="keyboard">
      {KEYBOARD_ROWS.map((row, rIdx) => (
        <div key={rIdx} className="keyboard-row">
          {row.map((key) => {
            const isAction = key === 'ENTER' || key === 'BACKSPACE';
            const state: LetterState = isAction ? 'UNUSED' : (keyStates[key] ?? 'UNUSED');
            const stateClass = state.toLowerCase();

            return (
              <button
                key={key}
                type="button"
                className={`key-btn ${isAction ? 'key-wide' : ''} key-${stateClass}`}
                data-key={key}
                data-state={stateClass}
                data-testid={`key-${key}`}
                disabled={disabled}
                onClick={() => onKeyPress(key)}
                aria-label={key === 'BACKSPACE' ? 'Backspace' : key === 'ENTER' ? 'Enter' : `${key} (${stateClass})`}
              >
                {key === 'BACKSPACE' ? '⌫' : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
