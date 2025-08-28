/**
 * Simple test helper utilities for Memento Protocol tests
 * 
 * Common utilities that make tests more readable and maintainable.
 * No frameworks, just helper functions.
 */

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
}

/**
 * Suppress console output during tests
 */
export function suppressConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };
  
  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
  });
  
  afterAll(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  });
}

/**
 * Create a test environment with automatic cleanup
 */
export function withTestEnv<T>(
  setup: () => T | Promise<T>,
  teardown?: (env: T) => void | Promise<void>
): () => T {
  let env: T;
  
  beforeEach(async () => {
    env = await setup();
  });
  
  afterEach(async () => {
    if (teardown) {
      await teardown(env);
    }
  });
  
  return () => env;
}

/**
 * Run tests with temporary environment variables
 */
export function withEnvVars(vars: Record<string, string>, fn: () => void | Promise<void>) {
  const originalEnv: Record<string, string | undefined> = {};
  
  return async () => {
    // Save original values
    for (const key in vars) {
      originalEnv[key] = process.env[key];
      process.env[key] = vars[key];
    }
    
    try {
      await fn();
    } finally {
      // Restore original values
      for (const key in vars) {
        if (originalEnv[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalEnv[key];
        }
      }
    }
  };
}

/**
 * Test multiple scenarios with the same test function
 */
export function testScenarios<T>(
  scenarios: Array<{ name: string; input: T; expected: any }>,
  testFn: (input: T) => any | Promise<any>
) {
  scenarios.forEach(({ name, input, expected }) => {
    it(name, async () => {
      const result = await testFn(input);
      expect(result).toEqual(expected);
    });
  });
}