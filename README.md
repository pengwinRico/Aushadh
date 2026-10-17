# Aushadh

An Expo app that keeps your reports and medicine cabinet in one place: photograph a
medicine pack or type its name, let the AI name it and file it, and read your results
with advice that follows them.

Everything a user records stays in the app's own store on the device — SQLite on iOS and
Android, `localStorage` in the browser build. The only thing that leaves the phone is the
pack photo or name handed to the AI endpoint you configure, and that happens once, when a
medicine is added.

Built from the design in `design/*.png` with Expo Router, React Native and TypeScript.

## Getting started

```bash
npm install
npx expo start
```

Then press `i` for the iOS simulator, `a` for the Android emulator, or `w` for the browser.
The camera and the on-device database are native modules, so a real device needs
`npx expo run:ios` / `npx expo run:android` rather than Expo Go.

First run asks for a name. Until one is stored, the welcome screen is the only reachable
screen; after that the app opens on the tabs.

## The app

Three tabs, each with its own heading and a gear for Settings.

- **Reports** — a scan action and the measured parameters, each with its status, value,
  trend line and reference range. The screen is drawn; reading a real report is not built
  yet (`TODO(scan-report)`), so the parameters come from `src/data/placeholders.ts`.
- **Cabinet** — the medicines you keep, grouped by category, each group with its own tint
  and a count. Groups fold open and shut.
- **Advice** — a summary card and a question box over a placeholder thread. Generating the
  summary and answering a question are not built yet (`TODO(summary)`, `TODO(ask-advice)`).

### Adding a medicine

The cabinet's add action opens a two-step sheet:

1. **Capture** — photograph the pack, or type the name. Either one is enough.
2. **Review** — the AI's reading arrives as *name, dose, what it is for,* and *category*,
   all editable. Nothing is written until you save it, and if the call fails the form says
   why and adds nothing.

The AI decides the category; the app files the medicine under the name it returns —
reusing the existing group when it recognises one, opening a new one with the next tint
when it does not. A group disappears once its last medicine goes.

Photos are kept with the medicine as a record and shown on its row. They are shrunk to
1024px before they are stored: a file under the app's documents directory on device, a
data URL in the browser preview.

### Removing

The trash action on a medicine row takes two taps — Remove, then Keep to change your mind —
because it deletes the photo and can take the whole group with it.

## Settings

The gear beside every tab's title opens Settings. Both choices are stored on the device:

- **Appearance** — Light or Dark. The light palette is sampled from `design/`; the dark one
  is built from the same tokens, so every screen, card, the tab bar, the navigation chrome
  and the status bar follow the switch, and it survives a relaunch.
- **AI key** — a key of your own. It is kept beside the profile in the app's database, sent
  only to the endpoint named under the field, and replaces the key the app was built with.
  *Clear* falls back to that one.

## The AI

The cabinet speaks to any OpenAI-compatible `/chat/completions` endpoint — a model on this
machine (Ollama, LM Studio) or a hosted provider. Copy `.env.example` to `.env` and set it:

```bash
EXPO_PUBLIC_AI_BASE_URL=http://localhost:11434/v1
EXPO_PUBLIC_AI_MODEL=llava
# EXPO_PUBLIC_AI_API_KEY=          # only for endpoints that ask for one
```

Expo bakes `EXPO_PUBLIC_*` into the bundle at start-up, so restart `npx expo start` after
editing `.env`, and treat a key set here as public — anyone with the app has it. Leave it
out and let each user paste their own in Settings instead.

### Google AI Studio (Gemma)

Google's API speaks the same dialect, so a Gemma model works with no code change. Make a
key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey), then set:

```bash
EXPO_PUBLIC_AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
EXPO_PUBLIC_AI_MODEL=gemma-4-31b-it
EXPO_PUBLIC_AI_API_KEY=your-key
```

Gemma 4 reads images. If a model is not served on this endpoint, Google answers 404 —
`gemini-3.8-flash` is on the same URL and reads packs too. `npm run check:ai` proves a key
and a model name with one real call before you pick up a pack.

## Where things live

```
src/app/          routes — welcome, (tabs)/{index,cabinet,advice}, add-medicine, settings
src/components/   the design system: cards, rows, buttons, fields, the tab bar
src/constants/    tokens — colour (light and dark), spacing, radius, type — and tones
src/context/      settings, profile and cabinet state for the whole app
src/data/         the model call, the photo pipeline, the store and its SQL
scripts/          check-sql.mjs, check-ai.mjs — the two things a device would otherwise prove
design/           the product design the screens are measured against
```

The store is one module per platform with the same API — `src/data/database.ts` for
SQLite, `src/data/database.web.ts` for the browser preview — over statements that live in
`src/data/sql.ts`. That file imports no native code, which is how the schema and the
queries are exercised against a real engine in CI-free Node, without a device.

## Checks

```bash
npm run lint         # eslint
npx tsc --noEmit     # types
npm run check:sql    # the schema and every statement, over node:sqlite
npm run check:ai     # one real call to the model in .env
```

`npm run check:ai` makes the same request the form makes, prints the reading, and never
prints the key. Without a `.env` it says so.
