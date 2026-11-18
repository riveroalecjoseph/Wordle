import { evaluateGuess } from '../engine/evaluator';
import type { GameStatus, LetterState } from '../engine/types';

interface BoardProps {
  guesses: readonly string[];
  currentInput: string;
  targetWord: string;
  status: GameStatus;
  shakeRow: boolean;
}

const ROWS = 6;
const COLS = 5;

export function Board({
  guesses,
  currentInput,
  targetWord,
  status,
  shakeRow,
}: BoardProps) {
  return (
    <div className="board-container">
      <div className="board-grid" role="grid" aria-label="Wordle Board" data-testid="board-grid">
        {Array.from({ length: ROWS }, (_, rowIndex) => {
          const isSubmitted = rowIndex < guesses.length;
          const isCurrentRow = rowIndex === guesses.length && status === 'IN_PROGRESS';
          const evaluatedRow = isSubmitted
            ? evaluateGuess(guesses[rowIndex], targetWord)
            : null;

          return (
            <div
              key={rowIndex}
              className={`board-row ${isCurrentRow && shakeRow ? 'shake' : ''}`}
              role="row"
              data-testid={`board-row-${rowIndex}`}
            >
              {Array.from({ length: COLS }, (_, colIndex) => {
                let letter = '';
                let tileState: 'correct' | 'present' | 'absent' | 'tbd' | 'empty' = 'empty';

                if (evaluatedRow) {
                  letter = evaluatedRow[colIndex].letter;
                  tileState = mapLetterStateToCss(evaluatedRow[colIndex].state);
                } else if (isCurrentRow) {
                  letter = currentInput[colIndex] ?? '';
                  tileState = letter ? 'tbd' : 'empty';
                }

                return (
                  <div
                    key={colIndex}
                    role="gridcell"
                    aria-label={
                      letter
                        ? `Row ${rowIndex + 1}, Letter ${colIndex + 1}: ${letter} (${tileState})`
                        : `Row ${rowIndex + 1}, Letter ${colIndex + 1}: empty`
                    }
                    className={`tile tile-${tileState}`}
                    data-state={tileState}
                    data-testid={`tile-${rowIndex}-${colIndex}`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function mapLetterStateToCss(state: LetterState): 'correct' | 'present' | 'absent' | 'empty' {
  if (state === 'CORRECT') return 'correct';
  if (state === 'PRESENT') return 'present';
  if (state === 'ABSENT') return 'absent';
  return 'empty';
}
