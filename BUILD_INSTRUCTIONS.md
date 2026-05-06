# Build Instructions for TravKings2 (Android)

This document outlines the steps to generate shareable APK files for testing and distribution.

## 1. Quick Shareable APK (Debug)
Best for quick testing. It doesn't require any signing configuration.

1. Open your terminal in the project root.
2. Run the following command:
   ```powershell
   cd android; ./gradlew assembleDebug
   ```
3. **Output Path:** `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 2. Optimized Distribution APK (Release)
This generates a more performant version of the app. 

### Current Configuration
The project is currently configured to use the **debug signing key** for release builds. This makes it easy to share manually, but it **cannot** be uploaded to the Google Play Store.

1. Open your terminal in the project root.
2. Run the following command:
   ```powershell
   cd android; ./gradlew clean; ./gradlew assembleRelease
   ```
3. **Output Path:** `android/app/build/outputs/apk/release/app-release.apk`

---

## 3. Production Release (For Play Store)
To upload to the Play Store, you must sign the app with a private release key.

### Step A: Generate a Keystore
Run this command and follow the prompts (keep the passwords safe!):
```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### Step B: Configure Credentials
1. Move `my-release-key.keystore` to the `android/app/` folder.
2. Edit `android/gradle.properties` and add:
   ```properties
   MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
   MYAPP_RELEASE_KEY_ALIAS=my-key-alias
   MYAPP_RELEASE_STORE_PASSWORD=*****
   MYAPP_RELEASE_KEY_PASSWORD=*****
   ```

### Step C: Update build.gradle
In `android/app/build.gradle`, update the `release` block to use `signingConfigs.release` instead of `signingConfigs.debug`.

---

## Common Commands
| Action | Command |
| :--- | :--- |
| **Clean Build** | `cd android; ./gradlew clean` |
| **Build Debug APK** | `cd android; ./gradlew assembleDebug` |
| **Build Release APK** | `cd android; ./gradlew assembleRelease` |
| **Build Bundle (AAB)** | `cd android; ./gradlew bundleRelease` |
