import { logger } from '../logger';
import { MementoError } from '../errors';

describe('logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('info', () => {
    it('should log info messages with blue info symbol', () => {
      logger.info('Test info message');
      
      // Test that console.log was called with the right pattern
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0];
      expect(call[0]).toContain('ℹ');
      expect(call[0]).toContain('Test info message');
    });

    it('should support additional arguments', () => {
      const obj = { foo: 'bar' };
      logger.info('Message with object', obj);
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy.mock.calls[0][1]).toBe(obj);
    });
  });

  describe('success', () => {
    it('should log success messages with green checkmark', () => {
      logger.success('Operation successful');
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0];
      expect(call[0]).toContain('✓');
      expect(call[0]).toContain('Operation successful');
    });
  });

  describe('warn', () => {
    it('should log warning messages with console.warn', () => {
      logger.warn('Warning message');
      
      // Should use console.warn, not console.log
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      
      const call = consoleWarnSpy.mock.calls[0];
      expect(call[0]).toContain('⚠');
      expect(call[0]).toContain('Warning message');
    });
  });

  describe('error', () => {
    it('should log error messages with red cross', () => {
      logger.error('Error occurred');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const call = consoleErrorSpy.mock.calls[0];
      expect(call[0]).toContain('✖');
      expect(call[0]).toContain('Error occurred');
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      logger.error('Error with details', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('Error with details');
      expect(consoleErrorSpy.mock.calls[1][0]).toContain('Test error');
    });

    it('should handle MementoError with suggestions', () => {
      const error = new MementoError('Test error', 'TEST_ERROR', 'Try this instead');
      logger.error('Memento error occurred', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('Memento error occurred');
      expect(consoleErrorSpy.mock.calls[1][0]).toContain('Test error');
      expect(consoleErrorSpy.mock.calls[2][0]).toContain('💡');
      expect(consoleErrorSpy.mock.calls[2][0]).toContain('Try this instead');
    });

    it('should handle MementoError without suggestions', () => {
      const error = new MementoError('Test error', 'TEST_ERROR');
      logger.error('Memento error occurred', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('Memento error occurred');
      expect(consoleErrorSpy.mock.calls[1][0]).toContain('Test error');
    });
  });

  describe('debug and verbose modes', () => {
    beforeEach(() => {
      logger.setVerbose(false);
      logger.setDebug(false);
    });

    it('should not log debug messages by default', () => {
      logger.debug('Debug message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log debug messages when debug mode is enabled', () => {
      logger.setDebug(true);
      logger.debug('Debug message');
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0];
      expect(call[0]).toContain('[DEBUG]');
      expect(call[0]).toContain('Debug message');
    });

    it('should not log verbose messages by default', () => {
      logger.verbose('Verbose message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log verbose messages when verbose mode is enabled', () => {
      logger.setVerbose(true);
      logger.verbose('Verbose message');
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0];
      expect(call[0]).toContain('Verbose message');
    });

    it('should log debug messages when verbose mode is enabled', () => {
      logger.setVerbose(true);
      logger.debug('Debug in verbose');
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0];
      expect(call[0]).toContain('[DEBUG]');
    });
  });

  describe('progress', () => {
    let stdoutWriteSpy: jest.SpyInstance;
    let originalIsTTY: boolean | undefined;

    beforeEach(() => {
      stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
      originalIsTTY = process.stdout.isTTY;
    });

    afterEach(() => {
      stdoutWriteSpy.mockRestore();
      if (originalIsTTY !== undefined) {
        process.stdout.isTTY = originalIsTTY;
      }
    });

    it('should write progress to stdout when TTY', () => {
      process.stdout.isTTY = true;
      logger.progress('Loading');
      
      expect(stdoutWriteSpy).toHaveBeenCalledTimes(1);
      const call = stdoutWriteSpy.mock.calls[0];
      expect(call[0]).toContain('⟳');
      expect(call[0]).toContain('Loading...');
    });

    it('should use console.log when not TTY', () => {
      process.stdout.isTTY = false;
      logger.progress('Loading');
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy.mock.calls[0][0]).toContain('⟳ Loading...');
    });

    it('should clear progress line when TTY', () => {
      process.stdout.isTTY = true;
      logger.clearProgress();
      
      expect(stdoutWriteSpy).toHaveBeenCalledWith('\r\x1b[K');
    });
  });
});