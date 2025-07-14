import { MementoError } from './errors';

// Logger configuration
let verboseMode = false;
let debugMode = false;

// ANSI color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Simple logger utility with colored output
export const logger = {
  setVerbose: (verbose: boolean) => {
    verboseMode = verbose;
  },
  
  setDebug: (debug: boolean) => {
    debugMode = debug;
  },
  
  // Core logging methods - content only, no formatting
  info: (message: string, ...args: any[]) => {
    console.log(`${colors.blue}ℹ${colors.reset} ${message}`, ...args);
  },
  
  success: (message: string, ...args: any[]) => {
    console.log(`${colors.green}✓${colors.reset} ${message}`, ...args);
  },
  
  warn: (message: string, ...args: any[]) => {
    console.warn(`${colors.yellow}⚠${colors.reset} ${message}`, ...args);
  },
  
  error: (message: string, error?: any) => {
    console.error(`${colors.red}✖${colors.reset} ${message}`);
    if (error) {
      if (error instanceof MementoError) {
        console.error(`  ${error.message}`);
        if (error.suggestion) {
          console.error(`  ${colors.cyan}💡 ${error.suggestion}${colors.reset}`);
        }
      } else if (error instanceof Error) {
        console.error(`  ${error.message}`);
      } else {
        console.error(`  ${String(error)}`);
      }
      
      if (verboseMode && error instanceof Error) {
        console.error(`${colors.gray}Stack trace:${colors.reset}`);
        console.error(colors.gray + error.stack + colors.reset);
      }
    }
  },
  
  debug: (message: string, ...args: any[]) => {
    if (debugMode || verboseMode) {
      console.log(`${colors.gray}[DEBUG] ${message}${colors.reset}`, ...args);
    }
  },
  
  verbose: (message: string, ...args: any[]) => {
    if (verboseMode) {
      console.log(`${colors.dim}${message}${colors.reset}`, ...args);
    }
  },
  
  // Spacing methods - explicit formatting control
  space: () => {
    console.log();
  },
  
  newline: () => {
    console.log();
  },
  
  progress: (message: string) => {
    if (process.stdout.isTTY) {
      process.stdout.write(`\r${colors.cyan}⟳${colors.reset} ${message}...`);
    } else {
      console.log(`⟳ ${message}...`);
    }
  },
  
  clearProgress: () => {
    if (process.stdout.isTTY) {
      process.stdout.write('\r\x1b[K'); // Clear current line
    }
  }
};