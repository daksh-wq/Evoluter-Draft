# Evoluter Cloud Functions

Backend API for the Evoluter Engine, providing secure server-side operations.

## Setup
```bash
cd functions
npm install
```

## Deploy
```bash
firebase deploy --only functions
```

## Functions
- **testGeneration** — AI test generation with server-side answer storage
- **submitTest** — Server-side scoring and result calculation
- **trackTabSwitch** — Proctoring event tracking
- **validateTestSession** — Session integrity validation
- **validateUserSession** — Onboarding validation
- **getUserUsageStats** — Rate limit usage display
- **generateFlashcards** — AI flashcard generation
- **reviewFlashcard** — SM-2 spaced repetition updates
- **extractTextFromPDF** — Server-side PDF text extraction
- **generateQuestionsFromPDF** — AI question generation from PDF content
