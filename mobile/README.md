# Great North Staff — mobile app

Expo (React Native) client for BP Great North station staff. Talks to the
`bp_staff_portal` API on the ERP.

## Run in development

```bash
cd mobile
npm install
npm start
```

Then open in Expo Go (scan the QR) or an emulator (`npm run android` / `npm run ios`).

## Configure the server

The default server is `https://bpgreatnorth.com` (see `app.json` →
`expo.extra.defaultServerUrl`). On the login screen, tap **Server settings** to
point at a different host during testing.

## Structure

```
src/
  api/client.js        axios instance + all endpoint wrappers
  context/AuthContext   token session (expo-secure-store)
  theme.js, constants.js
  screens/             one file per screen
App.js                 navigation (Home / Validate / Stock / Cashup / More tabs)
```

## Building an APK / store build

See [BUILD.md](BUILD.md).
