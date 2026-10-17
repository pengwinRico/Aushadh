# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Reading a medicine pack

Adding a medicine photographs the pack — or takes a typed name — and hands it to an
OpenAI-compatible model, which names the medicine, says what it is for and files it under a
group. The answer is shown before it is saved, and nothing is written if the call fails.

Copy `.env.example` to `.env` and point it at a model:

```bash
cp .env.example .env   # then set EXPO_PUBLIC_AI_BASE_URL and EXPO_PUBLIC_AI_MODEL
```

A model on the same machine (Ollama, LM Studio) keeps the photo and the name on the device;
a hosted provider receives them. Without a `.env`, the add-medicine form says so and adds
nothing. Take a photo on a device with `npx expo run:ios` or `npx expo run:android`, since
the camera is a native module.

### Google AI Studio (Gemma)

Google's API speaks the same dialect, so a Gemma model works without a code change. Make a
key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey), then set:

```bash
EXPO_PUBLIC_AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
EXPO_PUBLIC_AI_MODEL=gemma-4-31b-it
EXPO_PUBLIC_AI_API_KEY=your-key
```

Restart `npx expo start` after editing `.env` — Expo bakes these values into the bundle at
start-up, so a server already running keeps the old ones. Run `npm run check:ai` to prove
the key and the model name before picking up a pack. Gemma 4 reads images; if a model is not
served on this endpoint, Google answers 404 — `gemini-3.8-flash` is on the same URL and
reads packs too. The key ends up inside the app, so use one of your own.

## Checks

```bash
npm run lint         # eslint
npx tsc --noEmit     # types
npm run check:sql    # the storage layer, over node:sqlite
npm run check:ai     # one real call to the model in .env
```

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
