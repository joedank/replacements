# Project Brief: BetterReplacementsManager

## Project Overview

**BetterReplacementsManager** is a native macOS text replacement and AI prompt template manager that integrates with Espanso. It serves as a comprehensive tool for managing text expansions, snippets, and AI prompt templates through a modern, intuitive interface.

## Core Objectives

1. **Primary Goal**: Create a user-friendly macOS application that replaces and enhances existing text replacement workflow management
2. **Integration**: Seamless integration with Espanso text replacement engine
3. **AI Enhancement**: Built-in AI prompt template management and generation capabilities
4. **Native Experience**: Full macOS native application with proper system integration

## Key Requirements

### Functional Requirements
- Text replacement management (create, edit, delete, organize)
- Espanso configuration file generation and management
- AI prompt template library and management
- Project-based organization of replacements
- Search and filtering capabilities
- Import/export functionality
- Real-time preview and testing

### Technical Requirements
- **Platform**: macOS only (initial release)
- **Architecture**: Tauri v2 + React + TypeScript
- **UI Framework**: React 18 with TypeScript
- **Backend**: Rust (Tauri)
- **Build System**: Vite + npm
- **File Integration**: Direct Espanso config manipulation

### Success Criteria
- ✅ Minimal foundation with working Tauri + React setup
- Native macOS window opens and displays React content
- Production builds generate .app and .dmg files
- Clean, maintainable codebase with TypeScript
- Seamless development workflow

## Project Scope

### In Scope
- Text replacement management interface
- Espanso integration and configuration
- AI prompt template management
- Project organization features
- Native macOS integration
- Development and build tooling

### Out of Scope (Initial Release)
- Multi-platform support (Windows/Linux)
- Cloud synchronization
- Advanced AI model integration
- Plugin system
- Advanced theming

## Target Users
- Developers who use text replacements and snippets
- Content creators and writers
- Users of Espanso seeking better management tools
- AI prompt engineers and users

## Origin Context
This project is a refactor/port from an existing Swift/SwiftUI macOS application to the modern Tauri + React + TypeScript stack. The goal is to maintain equivalent functionality while gaining cross-platform potential and modern web technology benefits.

## Project Status
**FOUNDATION COMPLETE**: Successfully created minimal, clean foundation with working Tauri + React + TypeScript setup. All initial success criteria met.
