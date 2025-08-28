/**
 * Jest setup file for test categories
 * This file is loaded by Jest to set up custom matchers and test categorization
 */

import { TestCategories } from './TestCategories';

// Extend Jest matchers
expect.extend(TestCategories.createJestMatchers());

// Global test hooks for automatic categorization
const originalDescribe = global.describe;
const originalIt = global.it;
const originalTest = global.test;

// Override describe to capture test suite metadata
global.describe = function(suiteName: string, fn: () => void) {
  // Track current suite for automatic test registration
  const suite = originalDescribe(suiteName, () => {
    // Set up suite context
    const suiteContext = {
      name: suiteName,
      file: expect.getState().testPath || 'unknown'
    };
    
    // Execute the suite
    fn();
  });
  
  return suite;
} as any;

// Override it/test to capture individual test metadata
function wrapTestFunction(originalFn: any, testType: string) {
  return function(testName: string, fn?: () => void | Promise<void>, timeout?: number) {
    if (!fn) {
      // Handle pending tests
      return originalFn(testName);
    }
    
    const wrappedFn = async () => {
      const start = process.hrtime.bigint();
      const suiteName = expect.getState().currentTestName?.split(' ')[0] || 'Unknown Suite';
      
      try {
        const result = await fn();
        
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; // Convert to ms
        
        // Record successful execution
        TestCategories.recordTestExecution(testName, suiteName, duration, 'passed');
        
        return result;
      } catch (error) {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000;
        
        // Record failed execution
        TestCategories.recordTestExecution(
          testName, 
          suiteName, 
          duration, 
          'failed', 
          error instanceof Error ? error.message : String(error)
        );
        
        throw error;
      }
    };
    
    return originalFn(testName, wrappedFn, timeout);
  };
}

global.it = wrapTestFunction(originalIt, 'it');
global.test = wrapTestFunction(originalTest, 'test');

// Environment-based test filtering
const testEnvironment = process.env.NODE_ENV || 'local';
const slowTestsEnabled = process.env.JEST_SLOW_TESTS === 'true';
const performanceTestsEnabled = process.env.JEST_PERFORMANCE_TESTS === 'true';
const integrationTestsEnabled = process.env.JEST_INTEGRATION_TESTS === 'true';

// Skip tests based on environment
beforeEach(() => {
  const currentTestName = expect.getState().currentTestName;
  if (!currentTestName) return;
  
  // Skip slow tests unless explicitly enabled
  if (currentTestName.includes('[slow]') && !slowTestsEnabled) {
    pending('Slow test skipped (set JEST_SLOW_TESTS=true to enable)');
  }
  
  // Skip performance tests in CI unless explicitly enabled
  if (currentTestName.includes('[performance]') && testEnvironment === 'ci' && !performanceTestsEnabled) {
    pending('Performance test skipped in CI (set JEST_PERFORMANCE_TESTS=true to enable)');
  }
  
  // Skip integration tests unless explicitly enabled
  if (currentTestName.includes('[integration]') && !integrationTestsEnabled) {
    pending('Integration test skipped (set JEST_INTEGRATION_TESTS=true to enable)');
  }
});

// Global test teardown
afterAll(() => {
  // Generate test report if requested
  if (process.env.JEST_GENERATE_CATEGORY_REPORT === 'true') {
    const report = TestCategories.generateReport();
    console.log('\n' + report);
  }
});

// Helper to check if we're in a specific test environment
(global as any).isTestEnvironment = (env: string) => testEnvironment === env;
(global as any).isSlowTestsEnabled = () => slowTestsEnabled;
(global as any).isPerformanceTestsEnabled = () => performanceTestsEnabled;
(global as any).isIntegrationTestsEnabled = () => integrationTestsEnabled;