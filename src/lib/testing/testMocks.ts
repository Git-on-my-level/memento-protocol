/**
 * Simple mock helpers for common dependencies in Memento Protocol tests
 * 
 * These functions create pre-configured mocks for commonly used modules.
 * No complex state management or builders, just simple mock factories.
 */

/**
 * Create a mock logger with all methods as jest functions
 */
export function createMockLogger() {
  return {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    space: jest.fn(),
    debug: jest.fn()
  };
}

/**
 * Create a mock inquirer prompt function with configurable responses
 */
export function createMockInquirer(responses: Record<string, any> = {}) {
  return {
    prompt: jest.fn().mockImplementation(async (questions: any) => {
      // Handle both single question and array of questions
      const questionArray = Array.isArray(questions) ? questions : [questions];
      const result: Record<string, any> = {};
      
      for (const q of questionArray) {
        result[q.name] = responses[q.name] !== undefined 
          ? responses[q.name] 
          : q.default || null;
      }
      
      return result;
    })
  };
}

/**
 * Create a mock file system with common methods
 */
export function createMockFs(files: Record<string, string | Buffer> = {}) {
  return {
    readFileSync: jest.fn((path: string) => {
      if (files[path] !== undefined) return files[path];
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }),
    writeFileSync: jest.fn(),
    existsSync: jest.fn((path: string) => files[path] !== undefined),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn(() => Object.keys(files)),
    statSync: jest.fn((path: string) => ({
      isDirectory: () => path.endsWith('/'),
      isFile: () => !path.endsWith('/')
    }))
  };
}

/**
 * Create a mock child process exec function
 */
export function createMockExec(outputs: Record<string, { stdout?: string; stderr?: string; error?: Error }> = {}) {
  return jest.fn((command: string, callback: any) => {
    const output = outputs[command] || { stdout: '', stderr: '' };
    
    if (output.error) {
      callback(output.error, output.stdout || '', output.stderr || '');
    } else {
      callback(null, output.stdout || '', output.stderr || '');
    }
  });
}

/**
 * Create a mock commander command
 */
export function createMockCommand() {
  return {
    name: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    parseAsync: jest.fn().mockResolvedValue(undefined),
    opts: jest.fn().mockReturnValue({})
  };
}

/**
 * Reset all mocks in an object (useful for beforeEach)
 */
export function resetAllMocks(mocks: Record<string, any>) {
  Object.values(mocks).forEach(mock => {
    if (mock && typeof mock === 'object') {
      Object.values(mock).forEach(fn => {
        if (typeof fn === 'function' && (fn as any).mockReset) {
          (fn as any).mockReset();
        }
      });
    } else if (typeof mock === 'function' && (mock as any).mockReset) {
      (mock as any).mockReset();
    }
  });
}