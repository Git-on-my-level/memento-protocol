/**
 * Simple error testing helpers for Memento Protocol tests
 * 
 * These functions help test error conditions without complexity.
 * Just simple assertions and error generation utilities.
 */

/**
 * Assert that an async function throws a specific error
 */
export async function expectError<T extends Error = Error>(
  fn: () => Promise<any>,
  errorType?: new (...args: any[]) => T,
  messagePattern?: string | RegExp
): Promise<T> {
  try {
    await fn();
    throw new Error('Expected function to throw an error but it did not');
  } catch (error) {
    if (errorType && !(error instanceof errorType)) {
      throw new Error(
        `Expected error of type ${errorType.name} but got ${(error as any).constructor.name}`
      );
    }
    
    if (messagePattern) {
      const message = (error as Error).message;
      const matches = typeof messagePattern === 'string'
        ? message.includes(messagePattern)
        : messagePattern.test(message);
      
      if (!matches) {
        throw new Error(
          `Expected error message to match "${messagePattern}" but got "${message}"`
        );
      }
    }
    
    return error as T;
  }
}

/**
 * Assert that a sync function throws a specific error
 */
export function expectSyncError<T extends Error = Error>(
  fn: () => any,
  errorType?: new (...args: any[]) => T,
  messagePattern?: string | RegExp
): T {
  try {
    fn();
    throw new Error('Expected function to throw an error but it did not');
  } catch (error) {
    if (errorType && !(error instanceof errorType)) {
      throw new Error(
        `Expected error of type ${errorType.name} but got ${(error as any).constructor.name}`
      );
    }
    
    if (messagePattern) {
      const message = (error as Error).message;
      const matches = typeof messagePattern === 'string'
        ? message.includes(messagePattern)
        : messagePattern.test(message);
      
      if (!matches) {
        throw new Error(
          `Expected error message to match "${messagePattern}" but got "${message}"`
        );
      }
    }
    
    return error as T;
  }
}

/**
 * Create common filesystem errors for testing
 */
export const testErrors = {
  fileNotFound: (path: string) => {
    const error: any = new Error(`ENOENT: no such file or directory, open '${path}'`);
    error.code = 'ENOENT';
    error.path = path;
    return error;
  },
  
  permissionDenied: (path: string) => {
    const error: any = new Error(`EACCES: permission denied, open '${path}'`);
    error.code = 'EACCES';
    error.path = path;
    return error;
  },
  
  directoryNotEmpty: (path: string) => {
    const error: any = new Error(`ENOTEMPTY: directory not empty, rmdir '${path}'`);
    error.code = 'ENOTEMPTY';
    error.path = path;
    return error;
  },
  
  alreadyExists: (path: string) => {
    const error: any = new Error(`EEXIST: file already exists, mkdir '${path}'`);
    error.code = 'EEXIST';
    error.path = path;
    return error;
  }
};

/**
 * Test that a function properly handles errors
 */
export async function testErrorHandling(
  fn: () => Promise<any>,
  errorToThrow: Error,
  expectedHandling: {
    shouldCatch?: boolean;
    shouldLog?: jest.Mock;
    shouldReturn?: any;
    shouldRethrow?: boolean;
  }
): Promise<void> {
  const { shouldCatch = true, shouldLog, shouldReturn, shouldRethrow = false } = expectedHandling;
  
  if (shouldCatch && !shouldRethrow) {
    // Function should handle the error gracefully
    const result = await fn();
    
    if (shouldLog) {
      expect(shouldLog).toHaveBeenCalled();
    }
    
    if (shouldReturn !== undefined) {
      expect(result).toEqual(shouldReturn);
    }
  } else {
    // Function should propagate the error
    await expect(fn()).rejects.toThrow(errorToThrow);
  }
}