import type { AppSettings } from '../engine/types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onToggleHardMode: () => void;
  onToggleHighContrast: () => void;
  onToggleDarkMode: () => void;
}

export function SettingsModal({
  isOpen,
  settings,
  onClose,
  onToggleHardMode,
  onToggleHighContrast,
  onToggleDarkMode,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      data-testid="settings-modal"
      onClick={onClose}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="settings-modal-title">SETTINGS</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close Settings"
            data-testid="close-settings-btn"
          >
            ✕
          </button>
        </div>

        <div className="settings-list">
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-title">Hard Mode</div>
              <div className="setting-desc">
                Any revealed hints must be used in subsequent guesses
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.hardMode}
              aria-label="Hard Mode"
              className={`switch-btn ${settings.hardMode ? 'on' : ''}`}
              onClick={onToggleHardMode}
              data-testid="toggle-hard-mode"
            >
              <span className="switch-knob" />
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-title">Dark Theme</div>
              <div className="setting-desc">Switch between dark and light surface colors</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.darkMode}
              aria-label="Dark Theme"
              className={`switch-btn ${settings.darkMode ? 'on' : ''}`}
              onClick={onToggleDarkMode}
              data-testid="toggle-dark-mode"
            >
              <span className="switch-knob" />
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-title">High Contrast Mode</div>
              <div className="setting-desc">
                For improved color vision (Orange and Blue tiles)
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.highContrast}
              aria-label="High Contrast Mode"
              className={`switch-btn ${settings.highContrast ? 'on' : ''}`}
              onClick={onToggleHighContrast}
              data-testid="toggle-high-contrast"
            >
              <span className="switch-knob" />
            </button>
          </div>
        </div>

        <div className="modal-footer-note">
          <span>Wordle Offline PWA • 100% Client-Side</span>
        </div>
      </div>
    </div>
  );
}
