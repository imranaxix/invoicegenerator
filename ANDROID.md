# Invoice Generator for Android

The Android app uses the same React source and unchanged invoice document as the web app. Capacitor loads a copy of `dist` bundled inside the APK. There is no `server.url`, remote website wrapper, backend, login, or runtime font dependency. Your Vercel deployment remains a normal Vite application.

## Requirements

- Node.js 22.12+ (Node 24 also works).
- Android Studio Otter 2025.2.1 or newer, with Android SDK Platform 36 and its build tools installed through SDK Manager.
- JDK 21, available in Android Studio's bundled `jbr` directory. Select it as the Gradle JDK in Android Studio. For terminal builds, set `JAVA_HOME` to this directory.
- Android 7.0 / API 24 or newer on the test phone or emulator, with a reasonably recent Android System WebView.

This project pins its resolved dependencies in `pnpm-lock.yaml`. Use `pnpm install --frozen-lockfile` for that exact dependency set. `npm install` is also supported; consistently use your chosen package manager in your own checkout.

Official references: [Capacitor Android](https://capacitorjs.com/docs/android), [Capacitor 8 requirements](https://capacitorjs.com/docs/updating/8-0), and [Android Studio installation](https://developer.android.com/studio/install).

## Open in Android Studio

From the repository root:

```powershell
npm install
npm run android:sync
npm run android:open
```

Alternatively, choose **Open** in Android Studio and select the repository's `android` folder. Let Gradle sync finish. Android Studio creates `android/local.properties` for the local SDK path; this file is ignored by Git.

`android:sync` runs TypeScript checks, builds production Vite assets, and runs `cap sync android`. Always run it after changing React source, native plugins, or Capacitor configuration. Copied assets are generated and ignored by Git; a fresh checkout requires sync before it can build an app.

If terminal builds need SDK configuration, set these for your current PowerShell session, adjusting paths to your installation:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
```

Android Studio manages the Gradle wrapper and SDK downloads. No global Gradle installation is necessary. Java/Gradle dependencies require internet access during the initial build; the installed application does not require internet to launch or create invoices.

## Run on a phone or emulator

1. On your phone, enable Developer options and USB debugging; connect it by USB and approve the debugging prompt on the phone. Windows may require the manufacturer's USB driver.
2. In Android Studio, select your phone and press **Run**. Or create an API 36 emulator in Device Manager and select it.
3. You can also use `npm run android:run`, which rebuilds/syncs assets and lets Capacitor select a connected device.
4. For offline verification, enable airplane mode, force-stop the app, and open it again. All application assets must still load.

## Generate a debug APK

```powershell
npm run android:apk
```

This rebuilds/syncs the app, checks Java and SDK configuration, and runs the repository's Gradle wrapper with `assembleDebug`.

Output: `android/app/build/outputs/apk/debug/app-debug.apk`.

Copy that APK to your phone, open it, and allow installation from the chosen source when Android asks. Or install through Android Studio's Run action / `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.

To rebuild only the native project after assets are synchronized:

```powershell
Set-Location android
.\gradlew.bat assembleDebug
```

Install updates over the existing installation to preserve private data. A debug APK cannot update a release APK signed with a different key; use a JSON backup before switching signing identities or uninstalling.

## Signed release APK and Play Store AAB

1. Run `npm run android:sync`.
2. Open `android` in Android Studio.
3. Choose **Build → Generate Signed App Bundle or APK**.
4. Select **APK** for a signed distributable APK or **Android App Bundle** for Play Store upload.
5. Create/select a private signing keystore stored outside this repository. Back it up securely. Enter the alias and passwords in Android Studio, select `release`, and finish the wizard.
6. APK output is normally under `android/app/release/`; AAB output is normally under `android/app/build/outputs/bundle/release/`. Use the actual location shown by Android Studio.
7. Increase `versionCode` in `android/app/build.gradle` for every Play Store update and set an appropriate `versionName`. Complete Play Console requirements, testing, app signing, and store assets before publication.

`npm run android:aab` runs `bundleRelease` after syncing, but it does **not** invent a signing identity: without signing configured, its output is unsigned. Use the Android Studio signing wizard to create a signed release. Signing passwords and private keystores are not included in this project; keystore and signing property files are ignored by Git. Debug builds use Android's standard development signing key.

## Exports and backups

- Web: the existing browser JPG, PNG, PDF, and JSON downloads remain available.
- Android: image/PDF bytes and JSON backups are written with Capacitor Filesystem to a private export cache, then passed to Capacitor Share. The native chooser allows a destination app to save/share them. Available targets depend on installed apps; selecting a destination is necessary to keep an external copy. Dismissing the chooser does not guarantee a saved copy.
- Multi-page JPG/PNG exports open one chooser containing all page images. PDF is one A4 file containing all pages. The same document component, page boundaries, and calculation utility are used for both platforms.
- JSON **Import backup** uses the Android document picker through the WebView's file input. Choose a JSON file saved to accessible device storage or a document provider. After schema validation, the existing confirmation explains that importing replaces the current workspace. Back up the current workspace first.
- To transfer Vercel invoices to Android, download JSON from the web app's Settings, move it to the phone, and import it in the Android app. Browser and app storage are separate; data is never silently copied from Vercel.
- Exported cache files may be cleared by Android. They are not the primary invoice storage. No broad external storage permissions are requested. The FileProvider only exposes the export cache subtree.

## Persistence

Web data keeps the original `invoice-generator.v1` localStorage key and JSON schema.

Android hydrates its workspace from private `Directory.Data` before React mounts. Saves alternate between `invoice-workspace.0.json` and `invoice-workspace.1.json`, using validated revisioned snapshots. An interrupted write leaves the other snapshot available. Saves are serialized, flush when the app pauses, and flush before Back minimizes the app. Any existing WebView localStorage workspace is migrated if no native snapshots exist. If no existing snapshot is readable, automatic saving pauses and preserves those files until the user explicitly restores a backup.

App updates preserve this private directory when the application ID and signing identity remain the same. Clearing app data or uninstalling removes it. Keep external JSON backups. Native storage is app-private but not an application-level encrypted database.

Android Back closes the confirmation dialog first, returns other workspace screens to Create Invoice next, and saves/minimizes from the editor. It does not discard or reset the draft.

## Verification status and device acceptance checklist

During this integration, the existing calculation tests and additional tests for storage recovery, native file sharing, and browser/native export routing are run in Vitest. Native APIs and DOM captures in those new tests are mocks; they cannot establish Android WebView rendering or real share-sheet behavior.

Verified: all 49 Vitest tests pass; TypeScript and the production Vite build pass; Capacitor synchronizes all three native plugins; copied Android production assets match `dist` byte-for-byte; the local web server returns HTTP 200. The invoice document and calculation source files have no changes. Interactive browser regression was blocked by the browser tool's security policy.

This machine did not have Java, Android Studio, the Android SDK, an emulator, or an attached device available. The debug build helper was executed and reported missing Java. Therefore **no native Gradle build, emulator run, physical-device run, or APK installation has been verified here**.

Before relying on an installed APK, verify on a phone/emulator:

- Create an invoice; check the sample 120 pieces / Rs. 111,000 and a decimal-price example (3 × Rs. 0.29 = Rs. 0.87).
- Edit quantities and prices, add/duplicate/delete/sort rows, and confirm invalid rows block export.
- Add, edit, delete, and select default company profiles.
- Save, reopen, duplicate, and consolidate invoices; verify the product descriptions and totals.
- Export JPG, PNG, and PDF; open the shared files in recipient apps and check all rows, amounts, border, and totals. Check a multi-page invoice, including repeated headers and totals only on the final page.
- Export JSON, change an invoice, restore the JSON, and verify profiles, saved invoices, draft, and default company.
- Confirm Back closes a dialog, returns to the editor, then saves/minimizes; relaunch and check the draft.
- Force-stop/relaunch in airplane mode; verify app launch, exports to available offline targets, saved data, and calculations.
- Rotate the device; open numeric keyboards; check status/navigation bars, cutouts, horizontal table scrolling, and preview zoom.
- Install an update over the app without uninstalling and verify persistence.

Run JavaScript checks at any time with `npm test` and `npm run build`. The original invoice template and centralized arithmetic utility are unchanged by this Android integration.
