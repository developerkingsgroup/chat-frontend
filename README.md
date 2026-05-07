This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

>**Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

## Step 1: Start the Metro Server

First, you will need to start **Metro**, the JavaScript _bundler_ that ships _with_ React Native.

To start Metro, run the following command from the _root_ of your React Native project:

```bash
# using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Start your Application

Let Metro Bundler run in its _own_ terminal. Open a _new_ terminal from the _root_ of your React Native project. Run the following command to start your _Android_ or _iOS_ app:

### For Android

```bash
# using npm
npm run android

# OR using Yarn
yarn android
```

### For iOS

```bash
# using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up _correctly_, you should see your new app running in your _Android Emulator_ or _iOS Simulator_ shortly provided you have set up your emulator/simulator correctly.

This is one way to run your app — you can also run it directly from within Android Studio and Xcode respectively.

## Step 3: Modifying your App

Now that you have successfully run the app, let's modify it.

1. Open `App.tsx` in your text editor of choice and edit some lines.
2. For **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Developer Menu** (<kbd>Ctrl</kbd> + <kbd>M</kbd> (on Window and Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (on macOS)) to see your changes!

   For **iOS**: Hit <kbd>Cmd ⌘</kbd> + <kbd>R</kbd> in your iOS Simulator to reload the app and see your changes!
run 
## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [Introduction to React Native](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you can't get this to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.


npx react-native run-android --no-packager



✦ To build a shareable APK for your React Native app, you have two main options depending on your needs:

  Option 1: Generate a Debug APK (Quickest for testing)
  If you just want to quickly share the app with someone for testing, you can generate a debug APK. It doesn't require
  setting up signing keys.

   1. Open your terminal in the project root.
   2. Navigate to the android folder:

   1     cd android
   3. Run the build command:

   1     ./gradlew assembleDebug
   4. Once finished, your APK will be located at:
      android/app/build/outputs/apk/debug/app-debug.apk

  ---

  Option 2: Generate a Release APK (Recommended for distribution)
  This creates a optimized, signed version of the app.

  1. Generate a Signing Key (if you don't have one)
  Run this command in your terminal (replace my-release-key with your preferred name):

   1 keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA
     -keysize 2048 -validity 10000
  Note: Keep this file safe! You'll need it for all future updates.

  2. Configure Gradle
   1. Place the my-release-key.keystore file in the android/app directory.
   2. Edit android/gradle.properties and add the following (replace with your actual passwords):

   1     MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
   2     MYAPP_RELEASE_KEY_ALIAS=my-key-alias
   3     MYAPP_RELEASE_STORE_PASSWORD=*****
   4     MYAPP_RELEASE_KEY_PASSWORD=*****

  3. Update android/app/build.gradle
  Ensure your signingConfigs and buildTypes look like this:

    1 android {
    2     ...
    3     signingConfigs {
    4         release {
    5             if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
    6                 storeFile file(MYAPP_RELEASE_STORE_FILE)
    7                 storePassword MYAPP_RELEASE_STORE_PASSWORD
    8                 keyAlias MYAPP_RELEASE_KEY_ALIAS
    9                 keyPassword MYAPP_RELEASE_KEY_PASSWORD
   10             }
   11         }
   12     }
   13     buildTypes {
   14         release {
   15             ...
   16             signingConfig signingConfigs.release
   17         }
   18     }
   19 }

  4. Build the APK
  Run these commands:
   1 cd android
   2 ./gradlew assembleRelease
  Your shareable APK will be at:
  android/app/build/outputs/apk/release/app-release.apk

  Summary Tip
  If you just need to share the app right now without any setup, Option 1 is the fastest. If you are preparing for a
  public release, use Option 2.

  store password - travkingchat

# run on android pone via data cable
  adb reverse tcp:8081 tcp:8081; cd TravKings2; npm run android 