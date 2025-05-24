// Simple logger that only uses console
export const logger = {
  debug: (message: string, ...args: any[]) => {
    console.debug(`[DEBUG] ${message}`, ...args);
  },
  
  info: (message: string, ...args: any[]) => {
    console.info(`[INFO] ${message}`, ...args);
  },
  
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  }
};

// Helper to log Tauri command errors
export const logTauriError = (command: string, err: any) => {
  const errorMessage = `Tauri command '${command}' failed: ${err}`;
  logger.error(errorMessage, err);
};