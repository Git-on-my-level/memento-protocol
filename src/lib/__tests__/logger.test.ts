import { logger } from '../logger';

describe('logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('info', () => {
    it('should log info messages with cyan color', () => {
      logger.info('Test info message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[36mTest info message\x1b[0m');
    });
  });

  describe('success', () => {
    it('should log success messages with green checkmark', () => {
      logger.success('Operation successful');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[32m✓ Operation successful\x1b[0m');
    });
  });

  describe('warn', () => {
    it('should log warning messages with yellow color', () => {
      logger.warn('Warning message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[33m⚠ Warning message\x1b[0m');
    });
  });

  describe('error', () => {
    it('should log error messages with red cross', () => {
      logger.error('Error occurred');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('\x1b[31m✗ Error occurred\x1b[0m');
    });
  });

  describe('color support', () => {
    it('should handle different message types', () => {
      const messages = [
        'Simple message',
        'Message with numbers 123',
        'Message with special chars !@#$%',
        '',
        '   Indented message'
      ];

      messages.forEach(msg => {
        logger.info(msg);
        expect(consoleLogSpy).toHaveBeenCalledWith(`\x1b[36m${msg}\x1b[0m`);
      });
    });
  });
});