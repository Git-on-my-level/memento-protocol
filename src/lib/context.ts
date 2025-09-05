/**
 * Global CLI context system for zcc
 * Manages shared state across all commands, including non-interactive mode
 */

export interface ZccCliContext {
  nonInteractive: boolean;
  force: boolean;
  verbose: boolean;
  debug: boolean;
  projectRoot: string;
}

/**
 * Global context singleton for CLI state
 */
class CliContextManager {
  private static instance: CliContextManager;
  private context: ZccCliContext;

  private constructor() {
    this.context = {
      nonInteractive: false,
      force: false,
      verbose: false,
      debug: false,
      projectRoot: process.cwd()
    };
  }

  public static getInstance(): CliContextManager {
    if (!CliContextManager.instance) {
      CliContextManager.instance = new CliContextManager();
    }
    return CliContextManager.instance;
  }

  /**
   * Initialize context with CLI options and environment variables
   */
  public initialize(options: Partial<ZccCliContext> = {}): void {
    // Start with provided options
    this.context = { ...this.context, ...options };

    // Override with environment variables if present
    const zccNonInteractive = process.env.ZCC_NON_INTERACTIVE;
    if (zccNonInteractive && ['true', '1', 'TRUE', 'True'].includes(zccNonInteractive)) {
      this.context.nonInteractive = true;
    }

    // Check for CI environment (common non-interactive indicator)
    const ci = process.env.CI;
    if (ci && ['true', '1', 'TRUE', 'True'].includes(ci)) {
      this.context.nonInteractive = true;
    }

    // In non-interactive mode, force should be implicit for overwrite prompts ONLY if not explicitly set
    if (this.context.nonInteractive && options.force === undefined) {
      this.context.force = true;
    }
  }

  /**
   * Get current context
   */
  public getContext(): ZccCliContext {
    return { ...this.context };
  }

  /**
   * Update context (useful for testing or sub-commands)
   */
  public updateContext(updates: Partial<ZccCliContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Check if running in non-interactive mode
   */
  public isNonInteractive(): boolean {
    return this.context.nonInteractive;
  }

  /**
   * Check if force mode is enabled
   */
  public isForce(): boolean {
    return this.context.force;
  }

  /**
   * Check if verbose mode is enabled
   */
  public isVerbose(): boolean {
    return this.context.verbose;
  }

  /**
   * Check if debug mode is enabled
   */
  public isDebug(): boolean {
    return this.context.debug;
  }

  /**
   * Get project root
   */
  public getProjectRoot(): string {
    return this.context.projectRoot;
  }

  /**
   * Reset context to defaults (mainly for testing)
   */
  public reset(): void {
    this.context = {
      nonInteractive: false,
      force: false,
      verbose: false,
      debug: false,
      projectRoot: process.cwd()
    };
  }
}

/**
 * Global context instance
 */
export const cliContext = CliContextManager.getInstance();

/**
 * Convenience functions for accessing context
 */
export const isNonInteractive = () => cliContext.isNonInteractive();
export const isForce = () => cliContext.isForce();
export const isVerbose = () => cliContext.isVerbose();
export const isDebug = () => cliContext.isDebug();
export const getProjectRoot = () => cliContext.getProjectRoot();
export const getContext = () => cliContext.getContext();

/**
 * Helper function to determine if we should proceed without prompting
 * Used for confirmation prompts in non-interactive or force mode
 */
export const shouldProceedWithoutPrompt = () => {
  return cliContext.isNonInteractive() || cliContext.isForce();
};

/**
 * Helper function to handle non-interactive responses
 * Returns default values for various prompt types
 */
export const getNonInteractiveDefault = (
  promptType: 'confirm' | 'select' | 'input',
  defaultValue?: any
): any => {
  if (!cliContext.isNonInteractive()) {
    return undefined; // Let interactive prompts handle normally
  }

  switch (promptType) {
    case 'confirm':
      // Return provided default, or fall back to force behavior
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      return cliContext.isForce() ? true : false;
    case 'select':
      // Return first option or provided default
      return defaultValue;
    case 'input':
      // Return provided default or empty string
      return defaultValue ?? '';
    default:
      return defaultValue;
  }
};