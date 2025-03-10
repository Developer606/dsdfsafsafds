#!/bin/bash

# Set Java environment
if [ -d "/nix/store" ]; then
    # We're in a Nix environment
    JAVA_PATH=$(find /nix/store -name "openjdk-17" -type d | head -n 1)
    if [ -z "$JAVA_PATH" ]; then
        echo "Error: Could not find Java 17 in Nix store"
        exit 1
    fi
else
    # Try to find Java in standard locations
    JAVA_PATH=$(dirname $(dirname $(readlink -f $(which java))))
fi

if [ -z "$JAVA_PATH" ]; then
    echo "Error: Could not find Java installation"
    exit 1
fi

export JAVA_HOME=$JAVA_PATH
export PATH=$JAVA_HOME/bin:$PATH

# Print Java environment information
echo "Java Environment:"
echo "JAVA_HOME: $JAVA_HOME"
java -version

# Get the Replit URL for the server
REPLIT_URL=${REPLIT_URL:-"https://$REPL_SLUG.$REPL_OWNER.repl.co"}
echo "Using server URL: $REPLIT_URL"

# Create local.properties with Android SDK path
echo "sdk.dir=/home/runner/androidsdk" > android/local.properties

# Make Gradle wrapper executable
chmod +x android/gradlew

# Navigate to Android project directory
cd android

# Clean and build debug APK
./gradlew clean assembleDebug

# Check if build was successful
if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo "APK built successfully!"
    cp app/build/outputs/apk/debug/app-debug.apk ../app-debug.apk
    echo "APK copied to project root directory"

    # Print APK installation instructions
    echo "
To install the APK on your smartphone:
1. Download the app-debug.apk file from your Replit project
2. On your Android device, enable 'Install from Unknown Sources' in Settings
3. Open the downloaded APK file on your device
4. Follow the installation prompts

Note: The app will automatically connect to your Replit server at: $REPLIT_URL"
else
    echo "APK build failed!"
    exit 1
fi