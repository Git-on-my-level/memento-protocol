import { ZccError } from './errors';
import chalk from 'chalk';

// Logger configuration
let verboseMode = false;
let debugMode = false;
let colorsDisabled = false;

// Color detection logic
function shouldDisableColors(): boolean {
  // Check NO_COLOR environment variable (https://no-color.org)
  if (process.env.NO_COLOR) {
    return true;
  }
  
  // Check CI environment
  if (process.env.CI) {
    return true;
  }
  
  // Check if running in a TTY
  if (!process.stdout.isTTY) {
    return true;
  }
  
  return colorsDisabled;
}

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

// Color helper function
function colorize(colorCode: string, text: string): string {
  return shouldDisableColors() ? text : `${colorCode}${text}${colors.reset}`;
}

// Configure chalk based on color settings
export function configureChalk() {
  const colorsEnabled = !shouldDisableColors();
  chalk.level = colorsEnabled ? 1 : 0;
  return chalk;
}

// Get a chalk instance configured for current color settings
export function getChalk() {
  return configureChalk();
}

// Simple logger utility with colored output
export const logger = {
  setVerbose: (verbose: boolean) => {
    verboseMode = verbose;
  },
  
  setDebug: (debug: boolean) => {
    debugMode = debug;
  },
  
  setNoColor: (noColor: boolean) => {
    colorsDisabled = noColor;
  },
  
  // Core logging methods - content only, no formatting
  info: (message: string, ...args: any[]) => {
    console.log(`${colorize(colors.blue, 'ℹ')} ${message}`, ...args);
  },
  
  success: (message: string, ...args: any[]) => {
    console.log(`${colorize(colors.green, '✓')} ${message}`, ...args);
  },
  
  warn: (message: string, ...args: any[]) => {
    console.warn(`${colorize(colors.yellow, '⚠')} ${message}`, ...args);
  },
  
  error: (message: string, error?: any) => {
    console.error(`${colorize(colors.red, '✖')} ${message}`);
    if (error) {
      if (error instanceof ZccError) {
        console.error(`  ${error.message}`);
        if (error.suggestion) {
          console.error(`  ${colorize(colors.cyan, '💡')} ${error.suggestion}`);
        }
      } else if (error instanceof Error) {
        console.error(`  ${error.message}`);
      } else {
        console.error(`  ${String(error)}`);
      }
      
      if (verboseMode && error instanceof Error) {
        console.error(colorize(colors.gray, 'Stack trace:'));
        console.error(colorize(colors.gray, error.stack || ''));
      }
    }
  },
  
  debug: (message: string, ...args: any[]) => {
    if (debugMode || verboseMode) {
      console.log(colorize(colors.gray, `[DEBUG] ${message}`), ...args);
    }
  },
  
  verbose: (message: string, ...args: any[]) => {
    if (verboseMode) {
      console.log(colorize(colors.dim, message), ...args);
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
      process.stdout.write(`\r${colorize(colors.cyan, '⟳')} ${message}...`);
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