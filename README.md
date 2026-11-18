# Wordle Offline (Secure PWA)

A 100% offline-capable, mobile-first Progressive Web App (PWA) Wordle clone built with React, TypeScript, and Vite (`vite-plugin-pwa` + Workbox).

## Features
- **100% Offline Capable:** Precaches the entire application shell, icons, and full JSON dictionaries (~2,315 curated answer words and ~12,500 valid 5-letter guesses) via Service Worker on first visit. Zero runtime external network requests.
- **Exact NYT Two-Pass Evaluation Engine:** Accurately evaluates duplicate letters in target and guess words (`CORRECT` > `PRESENT` > `ABSENT` > `UNUSED`).
- **Two Game Modes:**
  - **Daily Mode:** Deterministic daily word selection indexed from `2026-01-01` using the user's local calendar date (`YYYY-MM-DD`), automatically rolling over at local midnight while preserving lifetime statistics and streaks.
  - **Unlimited Practice Mode:** Back-to-back random practice words with instant "Play Again" without affecting Daily Mode streaks.
- **Accessibility & UX Controls:**
  - **Hard Mode:** Enforces column-locked `CORRECT` letters and required `PRESENT` letters with specific violation toasts (*"3rd letter must be R"*, *"Guess must contain E"*).
  - **High Contrast Mode:** Swaps Green/Yellow tiles to Orange (`#f5793a`) and Blue (`#85c0f9`).
  - **Dark / Light Theme Toggle.**
  - **Mobile-First 100dvh Layout:** Fits cleanly on mobile screens without vertical scrolling and uses `touch-action: manipulation` for zero double-tap zoom delay.
- **Client-Side Security Hardening:**
  - Strict `<meta http-equiv="Content-Security-Policy">` and Netlify `public/_headers`.
  - Allowlist input validation (`/^[A-Z]$/` for letters, `/^[A-Z]{5}$/` for guesses) and zero `dangerouslySetInnerHTML` / `eval`.
  - Hardened `localStorage` deserialization with runtime schema validation and prototype-pollution rejection (`__proto__`, `constructor`, `prototype`).

## Setup & Development

```bash
# Install dependencies
npm install

# Regenerate dictionaries (src/data/answers.json & allowedGuesses.json) and PWA icons
npm run generate:data

# Start development server
npm run dev
```

## Verification & Testing

```bash
# Run strict TypeScript type checking
npx tsc --noEmit

# Run automated Vitest unit test suite
npx vitest run

# Audit dependencies for high/critical vulnerabilities
npm audit --audit-level=high

# Build production PWA bundle
npm run build

# Preview production build locally
npm run preview
```

## Security Headers & Netlify Deployment

The repository includes `public/_headers` which is automatically copied into `dist/_headers` during `npm run build`:

```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';
```

### Deploying to Netlify
1. Connect this GitHub repository to Netlify.
2. Set **Build command** to `npm run build`.
3. Set **Publish directory** to `dist`.
