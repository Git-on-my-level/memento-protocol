import { cliContext, isNonInteractive, isForce, shouldProceedWithoutPrompt, getNonInteractiveDefault } from '../context';

describe('Context', () => {
  beforeEach(() => {
    // Reset context before each test
    cliContext.reset();
    // Clear environment variables
    delete process.env.ZCC_NON_INTERACTIVE;
    delete process.env.CI;
  });

  describe('Initialization', () => {
    it('should initialize with provided options', () => {
      cliContext.initialize({
        nonInteractive: true,
        force: true,
        verbose: true,
        debug: true,
        projectRoot: '/test/path'
      });

      const context = cliContext.getContext();
      expect(context.nonInteractive).toBe(true);
      expect(context.force).toBe(true);
      expect(context.verbose).toBe(true);
      expect(context.debug).toBe(true);
      expect(context.projectRoot).toBe('/test/path');
    });

    it('should handle environment variables', () => {
      process.env.ZCC_NON_INTERACTIVE = 'true';
      
      cliContext.initialize({});

      expect(cliContext.isNonInteractive()).toBe(true);
    });

    it('should handle CI environment', () => {
      process.env.CI = 'true';
      
      cliContext.initialize({});

      expect(cliContext.isNonInteractive()).toBe(true);
    });

    it('should set force=true when non-interactive=true and force not explicitly set', () => {
      cliContext.initialize({
        nonInteractive: true
        // force not set
      });

      expect(cliContext.isNonInteractive()).toBe(true);
      expect(cliContext.isForce()).toBe(true);
    });

    it('should not override explicitly set force=false', () => {
      cliContext.initialize({
        nonInteractive: true,
        force: false
      });

      expect(cliContext.isNonInteractive()).toBe(true);
      expect(cliContext.isForce()).toBe(false);
    });
  });

  describe('Convenience functions', () => {
    it('should provide working convenience functions', () => {
      cliContext.initialize({
        nonInteractive: true,
        force: true,
        verbose: true,
        debug: true
      });

      expect(isNonInteractive()).toBe(true);
      expect(isForce()).toBe(true);
      expect(cliContext.isVerbose()).toBe(true);
      expect(cliContext.isDebug()).toBe(true);
    });
  });

  describe('shouldProceedWithoutPrompt', () => {
    it('should return true when non-interactive', () => {
      cliContext.initialize({ nonInteractive: true });
      expect(shouldProceedWithoutPrompt()).toBe(true);
    });

    it('should return true when force is true', () => {
      cliContext.initialize({ force: true });
      expect(shouldProceedWithoutPrompt()).toBe(true);
    });

    it('should return false when neither non-interactive nor force', () => {
      cliContext.initialize({});
      expect(shouldProceedWithoutPrompt()).toBe(false);
    });
  });

  describe('getNonInteractiveDefault', () => {
    beforeEach(() => {
      cliContext.initialize({ nonInteractive: true, force: true });
    });

    it('should return undefined for interactive mode', () => {
      cliContext.initialize({ nonInteractive: false });
      expect(getNonInteractiveDefault('confirm')).toBeUndefined();
    });

    it('should return true for confirm prompts in force mode', () => {
      expect(getNonInteractiveDefault('confirm')).toBe(true);
    });

    it('should return provided default for confirm prompts', () => {
      expect(getNonInteractiveDefault('confirm', false)).toBe(false);
    });

    it('should return default value for select prompts', () => {
      const defaultValue = 'option1';
      expect(getNonInteractiveDefault('select', defaultValue)).toBe(defaultValue);
    });

    it('should return default or empty string for input prompts', () => {
      expect(getNonInteractiveDefault('input', 'default-value')).toBe('default-value');
      expect(getNonInteractiveDefault('input')).toBe('');
    });
  });

  describe('Context updates', () => {
    it('should allow context updates', () => {
      cliContext.initialize({ nonInteractive: false });
      expect(cliContext.isNonInteractive()).toBe(false);

      cliContext.updateContext({ nonInteractive: true });
      expect(cliContext.isNonInteractive()).toBe(true);
    });
  });

  describe('Environment variable precedence', () => {
    it('should prioritize environment variables over options', () => {
      process.env.ZCC_NON_INTERACTIVE = '1';
      
      cliContext.initialize({ nonInteractive: false });

      expect(cliContext.isNonInteractive()).toBe(true);
    });

    it('should handle various truthy values for ZCC_NON_INTERACTIVE', () => {
      const truthyValues = ['true', '1', 'TRUE', 'True'];
      
      for (const value of truthyValues) {
        cliContext.reset();
        process.env.ZCC_NON_INTERACTIVE = value;
        cliContext.initialize({});
        expect(cliContext.isNonInteractive()).toBe(true);
        delete process.env.ZCC_NON_INTERACTIVE;
      }
    });

    it('should handle various truthy values for CI', () => {
      const truthyValues = ['true', '1', 'TRUE', 'True'];
      
      for (const value of truthyValues) {
        cliContext.reset();
        process.env.CI = value;
        cliContext.initialize({});
        expect(cliContext.isNonInteractive()).toBe(true);
        delete process.env.CI;
      }
    });
  });
});