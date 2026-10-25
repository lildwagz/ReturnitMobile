# ReturnIt (mobile app)

Warranty and receipt organizer. Expo (SDK 58) + React Native + Expo Router. The backend is a separate repo
(`lildwagz/Returnit`: Go API, login server, notifications); the API contract, screen-to-API map and design notes are in
its `Docs/mobile/` folder (start with `README.md` there, then `04-design/implementation-todo.md`).

## Run it

The app uses native modules (document picker, camera, notifications, date picker, sharing), so **Expo Go does not
work**: install a development build once, then start the dev server.

```bash
npm install
npx eas-cli@latest login                      # an Expo account that owns this project
npx eas-cli@latest build --profile development --platform android
npx expo start --dev-client
```

A new development build is only needed after adding a library with native code.

## Which backend it talks to

`src/lib/auth.ts` picks the servers:

| Build | Backend |
|---|---|
| release build (`preview`, `production`) | the deployed server |
| development build | `localhost` (API 8080, login 8180) |
| development build with `EXPO_PUBLIC_USE_PROD=true npx expo start --dev-client` | the deployed server |

On a real phone `localhost` is the phone itself, so use the deployed server when testing on a device.

## Builds

| Profile | Result |
|---|---|
| `development` | development build (dev client) |
| `preview-arm64` | small APK for current phones only (arm64): faster to build and about a third of the size |
| `production` | APK with every CPU architecture (about 100 MB), for emulators and old phones |

```bash
npx eas-cli@latest build --profile preview-arm64 --platform android
```

`google-services.json` (Firebase client config, needed for push notifications) is not in the repo. It is stored as the
EAS file variable `GOOGLE_SERVICES_JSON` of the `production` environment (`app.config.js` reads it, and the
`preview-arm64` profile uses that environment too); for a local build put the file in the project root.

## Checks before a commit

```bash
npx tsc --noEmit    # a few errors in *.web.tsx files and global.css are known and not related to the Android/iOS app
npx expo lint
```

## Where things are

| What | Where |
|---|---|
| Screens (Expo Router) | `src/app/` (`(tabs)` after login, `login.tsx`, `purchase/`, `account.tsx`) |
| Login, tokens, API calls | `src/lib/auth.ts` |
| Warranty rules, dates, money | `src/lib/warranty.ts` |
| Receipt picking and upload | `src/lib/receipt.ts` |
| CSV export | `src/lib/export.ts` |
| Colors, fonts, design tokens | `src/constants/theme.ts` (see `04-design/theme-tokens.md` in the backend repo) |
| Shared components | `src/components/` |

Navigation is guarded: the tab bar and purchase screens exist only while signed in (`src/app/_layout.tsx`).
