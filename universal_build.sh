#!/bin/bash

# Universal build script for macOS
# Usage: ./universal_build.sh [--debug|--release]

set -e

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "This script is for macOS only"
    exit 1
fi

# Source cargo environment
source ~/.cargo/env

# Default to release build
BUILD_TYPE="--release"
BUILD_MODE="release"
DEBUG_FLAG=""

if [[ "$1" == "--debug" ]]; then
    BUILD_TYPE=""
    BUILD_MODE="debug"
    DEBUG_FLAG="--debug"
    echo "Building in debug mode..."
elif [[ "$1" == "--release" ]]; then
    echo "Building in release mode..."
else
    echo "Building in release mode (default)..."
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
if [[ -n "$DEBUG_FLAG" ]]; then
    # For debug builds, use --debug flag
    VITE_DEBUG_BUILD=true npm run tauri build -- --debug
else
    # For release builds
    npm run tauri build $BUILD_TYPE
fi

echo "Build complete!"

# Define source and destination paths
SOURCE_APP="src-tauri/target/$BUILD_MODE/bundle/macos/BetterReplacementsManager.app"
if [[ -n "$DEBUG_FLAG" ]]; then
    DEST_APP="BRMdebug.app"
else
    DEST_APP="BRM.app"
fi

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

# Note: DMG creation has been disabled in tauri.conf.json (targets: "app" instead of "all")

echo ""
echo "🎉 Build complete!"
if [ -d "$DEST_APP" ]; then
    echo "   📱 App: ./$DEST_APP"
fi
