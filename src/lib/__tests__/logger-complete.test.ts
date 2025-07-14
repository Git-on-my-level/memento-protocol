import { logger } from '../logger';

describe('logger complete coverage', () => {
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

  it('should test all logger methods', () => {
    // Test info
    logger.info('Info message');
    expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[36mInfo message\x1b[0m');

    // Test success
    logger.success('Success message');
    expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[32m✓ Success message\x1b[0m');

    // Test warn
    logger.warn('Warning message');
    expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[33m⚠ Warning message\x1b[0m');

    // Test error
    logger.error('Error message');
    expect(consoleErrorSpy).toHaveBeenCalledWith('\x1b[31m✗ Error message\x1b[0m');
  });
});