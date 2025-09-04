/**
 * Mock for execa library to handle ES module issues in Jest
 */

export interface ExecaResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ExecaOptions {
  cwd?: string;
  env?: Record<string, string>;
  shell?: boolean;
  timeout?: number;
}

// Mock implementation that allows customization per test
let mockBehavior: 'success' | 'error' | 'timeout' | 'spawn_error' = 'success';

const execaMock = jest.fn(async (_command: string, _args?: string[], _options?: ExecaOptions): Promise<ExecaResult> => {
  // Check for timeout first since it's an exception
  if (mockBehavior === 'timeout') {
    const error = new Error('Command timed out after 100ms') as any;
    error.timedOut = true;
    error.stdout = '';
    error.stderr = '';
    throw error;
  }
  
  if (mockBehavior === 'spawn_error') {
    const error = new Error('Failed to spawn script') as any;
    error.code = 'ENOENT';
    throw error;
  }
  
  if (mockBehavior === 'error') {
    const error = new Error('Script exited with code 1') as any;
    error.exitCode = 1;
    error.stdout = '';
    error.stderr = 'Error output';
    throw error;
  }
  
  // Default success behavior
  return {
    stdout: 'Success output',
    stderr: '',
    exitCode: 0
  };
});

// Helper to set behavior for tests
(execaMock as any).setMockBehavior = (behavior: typeof mockBehavior) => {
  mockBehavior = behavior;
};

export const execa = execaMock;

export const execaSync = jest.fn((_command: string, _args?: string[], _options?: ExecaOptions): ExecaResult => {
  return {
    stdout: 'Success output',
    stderr: '',
    exitCode: 0
  };
});

export default execa;