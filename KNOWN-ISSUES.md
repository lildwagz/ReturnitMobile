# Known issues

## Open
- **No product photo.** The design poster shows one on the list and the form, but the API stores one receipt per
  purchase and no product photo. The list shows no picture until the backend supports it.
- **Type errors in web-only files.** `npx tsc --noEmit` reports a few errors in `*.web.tsx` files and for
  `global.css`. They do not affect the Android and iOS builds.
- **Lint errors** about calling `setState` inside effects and a component created during render
  (`purchase-form.tsx`), plus `push.ts` (`AndroidImportance`). They are old and the screens work.
- **No offline mode.** Data is cached in memory only (30 seconds fresh, refreshed in the background, cleared on
  sign-out), so nothing is shown without a connection after the app was closed. Receipt images are not cached.
- **"Next reminder" is not shown.** The API only returns reminders that were already sent.

## Fixed
- **Receipt viewing on a phone** (the signed link pointed to a name that only exists inside Docker). The server now
  signs links for its public address, so receipts open on the phone.
