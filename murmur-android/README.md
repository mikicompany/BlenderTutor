# Murmur (Android)

Voice notes that never leave your phone. Speech-to-text runs on the device with
Whisper (base, 8-bit), and **Work mode** turns everything you say into action items.

- No internet permission: Android blocks all network access for the app.
- No cloud backup: notes are excluded from Android backup and device transfer.
- A Content-Security-Policy in `www/index.html` also blocks any request outside the app.

## Build the APK

Needs Node 22+, JDK 21 and the Android SDK (platform 36, build-tools 36).

```bash
cd murmur-android
npm install
npm run build:apk      # → android/app/build/outputs/apk/release/app-release.apk
```

`npm run assets` (run by `build:apk`) copies transformers.js and the ONNX Runtime
engine from `node_modules`, and downloads the Whisper model files, pinned to a
fixed revision, into `www/`. These are large and git-ignored. Downloading them at
build time is the only time anything is fetched; the built app itself is offline.

### Signing

Release builds are signed when `android/keystore.properties` exists:

```
storeFile=murmur-release.jks
storePassword=…
keyAlias=murmur
keyPassword=…
```

Keep the keystore safe and reuse it: Android only installs an update over the
existing app (keeping your notes) when it is signed with the same key.

## Layout

- `www/` — the app (HTML/JS). `whisper-worker.js` runs Whisper in a Web Worker.
- `android/` — Capacitor's Android project (manifest without network permission).
- `scripts/prepare-assets.mjs` — bundles the model and engine into `www/`.
