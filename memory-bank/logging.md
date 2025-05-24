# Logging Setup for macOS Builds

## Overview
Since this is a macOS-only Tauri application without web UI access, we've implemented a comprehensive logging system that works across both Rust backend and React frontend.

## Logging Locations

### Development Mode
1. **Console Output**: When running `./universal_build.sh`, logs appear in your terminal
2. **macOS Console.app**: Open Console.app and filter by "BetterReplacementsManager"
3. **Log Files**: Located at `~/Library/Logs/com.josephmcmyne.betterreplacementsmanager/`

### Production Mode
1. **macOS Console.app**: Primary way to view logs
2. **Log Files**: Same location as development

## Backend (Rust) Logging

### Setup
- Uses `log` crate with `env_logger` for console output
- Integrated `tauri-plugin-log` for file and webview logging
- Log levels: ERROR, WARN, INFO, DEBUG

### Usage
```rust
use log::{debug, error, info, warn};

// In your functions
info!("Reading file: {}", file_path);
error!("Failed to parse: {}", e);
debug!("Debug info: {:?}", data);
```

### Environment Variables
Set log level via environment variable:
```bash
RUST_LOG=debug ./universal_build.sh
```

## Frontend (React/TypeScript) Logging

### Setup
- Created `src/utils/logger.ts` utility
- Uses `@tauri-apps/plugin-log` for Tauri integration
- Mirrors to browser console in development

### Usage
```typescript
import { logger } from '@/utils/logger';

// Async logging methods
await logger.info('User clicked button');
await logger.error('Failed to load data', error);
await logger.debug('State updated', newState);

// For Tauri command errors
import { logTauriError } from '@/utils/logger';
try {
  await invoke('some_command');
} catch (err) {
  await logTauriError('some_command', err);
}
```

## Viewing Logs

### Method 1: In-App Debug Panel (NEW!)
1. Look for "Debug" button in bottom-right corner
2. Click to open the debug console
3. View all console logs in real-time
4. Filter logs by typing in the search box
5. Export logs to a file for sharing

### Method 2: Terminal (Development)
```bash
# Run with debug logging enabled
RUST_LOG=debug ./universal_build.sh

# Logs appear in real-time in your terminal
```

### Method 3: macOS Console.app
1. Open Console.app (Applications > Utilities)
2. In the search bar, type: `BetterReplacementsManager`
3. Select your Mac under "Devices"
4. Logs appear in real-time

### Method 4: Log Files
```bash
# View log files
ls ~/Library/Logs/com.josephmcmyne.betterreplacementsmanager/

# Tail the latest log
tail -f ~/Library/Logs/com.josephmcmyne.betterreplacementsmanager/*.log
```

### Method 5: Developer Tools (If Enabled)
1. With `"devtools": true` in tauri.conf.json
2. Right-click in the app window
3. Select "Inspect Element" 
4. Console tab shows frontend logs

## Best Practices

1. **Log Levels**:
   - ERROR: Critical failures
   - WARN: Potential issues
   - INFO: Important events (file operations, user actions)
   - DEBUG: Detailed debugging info

2. **Performance**: Logging is async in frontend to avoid blocking UI

3. **Sensitive Data**: Never log passwords, API keys, or personal data

4. **Structured Logging**: Include context in log messages
   ```typescript
   await logger.info(`Saving replacement: trigger="${trigger}" category="${categoryId}"`);
   ```

## Troubleshooting

### Logs Not Appearing
1. Check log level: `RUST_LOG=debug`
2. Ensure app has write permissions to log directory
3. Check Console.app filters

### Too Many Logs
1. Adjust log level: `RUST_LOG=info` or `RUST_LOG=warn`
2. Filter in Console.app by process or message content

### Finding Crash Logs
1. Check `~/Library/Logs/DiagnosticReports/`
2. Look for files starting with `BetterReplacementsManager`