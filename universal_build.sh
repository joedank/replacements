#!/bin/bash

# Universal build script for macOS
# Usage: ./universal_build.sh [--release]

set -e

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "This script is for macOS only"
    exit 1
fi

# Source cargo environment
source ~/.cargo/env

# Default to development build
BUILD_TYPE=""
BUILD_MODE="debug"
if [[ "$1" == "--release" ]]; then
    BUILD_TYPE="--release"
    BUILD_MODE="release"
    echo "Building in release mode..."
else
    echo "Building in development mode..."
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Type check
echo "Running type check..."
npm run typecheck

# Build the app
echo "Building Tauri app..."
if [[ -n "$BUILD_TYPE" ]]; then
    npm run tauri build $BUILD_TYPE
else
    npm run tauri build
fi

echo "Build complete!"

# Define source and destination paths
SOURCE_APP="src-tauri/target/$BUILD_MODE/bundle/macos/BetterReplacementsManager.app"
DEST_APP="BetterReplacementsManager.app"

# Move .app to project root
if [ -d "$SOURCE_APP" ]; then
    echo "Moving .app to project root..."
    # Remove existing app if it exists
    if [ -d "$DEST_APP" ]; then
        rm -rf "$DEST_APP"
    fi
    mv "$SOURCE_APP" "$DEST_APP"
    echo "✅ App moved to: ./$DEST_APP"
else
    echo "❌ Could not find built app at: $SOURCE_APP"
fi

# Move .dmg to project root (release builds only)
if [[ "$BUILD_MODE" == "release" ]]; then
    SOURCE_DMG="src-tauri/target/release/bundle/dmg/BetterReplacementsManager_0.1.0_aarch64.dmg"
    DEST_DMG="BetterReplacementsManager_0.1.0_aarch64.dmg"
    
    if [ -f "$SOURCE_DMG" ]; then
        echo "Moving .dmg to project root..."
        # Remove existing dmg if it exists
        if [ -f "$DEST_DMG" ]; then
            rm -f "$DEST_DMG"
        fi
        mv "$SOURCE_DMG" "$DEST_DMG"
        echo "✅ DMG moved to: ./$DEST_DMG"
    else
        echo "❌ Could not find built DMG at: $SOURCE_DMG"
    fi
fi

echo ""
echo "🎉 Build artifacts in project root:"
if [ -d "$DEST_APP" ]; then
    echo "   📱 App: ./$DEST_APP"
fi
if [[ "$BUILD_MODE" == "release" ]] && [ -f "$DEST_DMG" ]; then
    echo "   💿 DMG: ./$DEST_DMG"
fi
