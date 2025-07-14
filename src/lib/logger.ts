// Simple logger utility with colored output
export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`ℹ ${message}`, ...args);
  },
  
  success: (message: string, ...args: any[]) => {
    console.log(`✓ ${message}`, ...args);
  },
  
  warn: (message: string, ...args: any[]) => {
    console.warn(`⚠ ${message}`, ...args);
  },
  
  error: (message: string, error?: any) => {
    console.error(`✖ ${message}`);
    if (error) {
      if (error instanceof Error) {
        console.error(`  ${error.message}`);
      } else {
        console.error(`  ${String(error)}`);
      }
    }
  }
};