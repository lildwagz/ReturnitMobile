# ReturnIt

A warranty and receipt organizer for Android and iOS. Keep purchases and their receipts in one place, see which warranties
are running out, and get reminders before they end.

The app talks to the ReturnIt backend (repo `lildwagz/Returnit`: Go API, login server, notifications). The API contract,
the screen-to-API map and the design notes live in that repo under `Docs/mobile/`; start with
`04-design/implementation-todo.md` (what is done, what is left) and `04-design/theme-tokens.md` (colors, fonts, components).

## What it does

- **Login** with the system browser (OIDC + PKCE): e-mail and password, new account registration, or **Continue with
  Google** (a new person is registered automatically). Tokens are kept in the device's secure store and refreshed silently.
- **Purchases**: add, edit, delete, search, filter by warranty status. A receipt (PDF, JPEG or PNG, up to 10 MB; file or
  camera) can be attached when adding or later; PDFs are previewed inside the app.
- **Warranty status** (active, expiring within 30 days, expired, unknown) and days left are computed on the phone from the
  end date, so they stay right after midnight.
- **Reminders**: 30, 14, 7, 3 and 1 day before the end, at 09:00 in the chosen time zone, with optional quiet hours. Every
  reminder appears in the in-app history; one extra channel (phone notification or e-mail) can be chosen.
- **Account**: profile, delete the account (login again, then a waiting period that can be cancelled), sign out.
- **Export** the purchase list as CSV from Settings.
- Light and dark theme.

## Stack

Expo SDK 58, React Native 0.88, React 19, Expo Router (file-based routes, typed routes), TanStack Query,
`expo-auth-session` and `expo-secure-store`, `expo-notifications`, `react-native-pdf`, Plus Jakarta Sans.

## Run it

The app uses native modules (document picker, camera, notifications, date picker, sharing, PDF), so **Expo Go does not
work**. Install a development build once, then start the dev server:

```bash
npm install
npx eas-cli@latest login                     # an Expo account that owns the EAS project
npx eas-cli@latest build --profile development --platform android
npx expo start --dev-client
```

Build again only after adding a library that contains native code.

### Which backend it uses

`src/lib/auth.ts` decides:

| Build | Backend |
|---|---|
| release build (`preview-arm64`, `production`) | the deployed server |
| development build | `localhost` (API 8080, login 8180) |
| development build started with `EXPO_PUBLIC_USE_PROD=true npx expo start --dev-client` | the deployed server |

On a real phone `localhost` is the phone itself: use the deployed server when testing on a device.

## Build an APK

| Profile | Result |
|---|---|
| `development` | development build (dev client) |
| `preview-arm64` | APK for current phones only (arm64): about 35 MB, about 11 minutes |
| `production` | APK with every CPU architecture: about 100 MB, about 20 minutes (emulators and old phones) |

```bash
npx eas-cli@latest build --profile preview-arm64 --platform android
```

`google-services.json` (Firebase client configuration, needed for push) is not in the repo. It is the EAS file variable
`GOOGLE_SERVICES_JSON` of the `production` environment, which `app.config.js` reads; the `preview-arm64` profile uses that
environment too. For a local build put the file in the project root.

## Force update and maintenance

The server can lock an outdated build, invite users to update, or announce maintenance; the app only obeys.
`src/lib/app-config.ts` asks `GET /app-config` when the app opens and when it returns to the foreground, `src/lib/auth.ts` sends
`X-App-Version` with every API call (the `version` in `app.json`: **raise it for every build you hand out**), and a `426` or `503` answer shows the
same lock screen (`src/components/update-gate.tsx`). If the server cannot be reached the app carries on.

To see it on a phone: install a build, then ask whoever runs the server to raise the minimum above that build
(`./publish-apk.sh min <version>`, see the backend repo's `deploy/README.md`, section 7.1), then reopen the app or pull to refresh.
The server tries to be safe: it never accepts a minimum above the newest published build.

## Before you commit

```bash
npx tsc --noEmit     # a few errors in *.web.tsx files and global.css are known (see KNOWN-ISSUES.md)
npx expo lint
```

## How the code is organized

| What | Where |
|---|---|
| Screens (Expo Router) | `src/app/`: `(tabs)/` after login, `login.tsx`, `purchase/`, `account.tsx` |
| Login, tokens, API calls | `src/lib/auth.ts` |
| Data hooks and the query cache | `src/lib/queries.ts`, `src/lib/query-client.ts` |
| Warranty rules, dates, money | `src/lib/warranty.ts` |
| Receipts (pick, capture, upload) | `src/lib/receipt.ts` |
| CSV export | `src/lib/export.ts` |
| Colors, fonts, design tokens | `src/constants/theme.ts` |
| Shared components | `src/components/` |

Things the code relies on:

- **Navigation is guarded.** The tab bar and the purchase screens exist only while signed in; before that only the login
  screen does (`Stack.Protected` in `src/app/_layout.tsx`). A new screen that needs a login goes inside that guard.
- **Data comes through the query cache.** Read with the hooks in `queries.ts`; after any change to a purchase or its
  receipt call `invalidatePurchases()`. The cache lives in memory only, is fresh for 30 seconds, and is cleared on sign-out
  and when the session ends, so nothing of one user stays for the next.
- **Dates are plain dates** (`YYYY-MM-DD`), never timestamps; do not convert them through time zones.
- **Edit replaces the whole record** (`PATCH` sends every field).
- **Style:** use the tokens in `theme.ts` (never hard-coded colors; error text is `themeColor="errorText"`), `AppButton`
  instead of React Native's `Button`, `AppTextInput` for fields, `ThemedView type="backgroundElement"` for cards.

Known problems and what is not done yet: `KNOWN-ISSUES.md`.
