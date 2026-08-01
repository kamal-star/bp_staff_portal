# Building the Staff app

Uses [EAS Build](https://docs.expo.dev/build/introduction/).

## One-time setup

```bash
npm install -g eas-cli
eas login
cd mobile
npm install
```

If this is a new EAS project, run `eas init` to create the project and write its
`projectId` into `app.json` (`expo.extra.eas.projectId`).

## Android APK (internal testing)

```bash
eas build -p android --profile preview
```

Produces an installable `.apk` (see the `preview` profile in `eas.json`).

## Production builds

```bash
eas build -p android --profile production   # .aab for Play Store
eas build -p ios --profile production        # requires an Apple account
```

## App identity

- Name: **Great North Staff**
- Android package: `com.bpgreatnorth.staff`
- iOS bundle id: `com.bpgreatnorth.staff`

(The customer order app uses `com.bpgreatnorth.orders`, so the two install side
by side.)
