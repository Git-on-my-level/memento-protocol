/**
 * Example test showing how to use the new test utilities
 * 
 * This demonstrates the practical improvements from using
 * the minimal test utilities vs verbose test setup.
 */

import {
  createTestComponent,
  createTestConfig,
  createTestPackStructure,
  createMockLogger,
  expectError,
  testErrors,
  testScenarios
} from '../index';

describe('Example Usage of Test Utilities', () => {
  
  describe('Creating test data with factories', () => {
    it('creates components with minimal code', () => {
      // Before: 10+ lines of object creation
      // After: 1-3 lines with factory
      const component = createTestComponent({
        name: 'my-mode',
        type: 'mode'
      });
      
      expect(component.name).toBe('my-mode');
      expect(component.type).toBe('mode');
      // Defaults are automatically provided
      expect(component.metadata.description).toBeDefined();
      expect(component.metadata.version).toBe('1.0.0');
    });
    
    it('creates pack structures easily', () => {
      // Create a complete pack structure in 4 lines
      const pack = createTestPackStructure({
        manifest: createTestPackStructure().manifest // Use defaults and override
      });
      
      // Or just override specific nested fields
      pack.manifest.name = 'frontend-pack';
      pack.manifest.components.modes = [{ name: 'react-dev', required: true }];
      
      expect(pack.manifest.name).toBe('frontend-pack');
      expect(pack.manifest.components.modes[0].name).toBe('react-dev');
      // All other required fields have sensible defaults
    });
    
    it('creates configs with type safety', () => {
      const config = createTestConfig({
        defaultMode: 'architect',
        preferredWorkflows: ['review', 'test']
      });
      
      expect(config.defaultMode).toBe('architect');
      expect(config.preferredWorkflows).toEqual(['review', 'test']);
      expect(config.ui?.colorOutput).toBe(true); // Default value
    });
  });
  
  describe('Testing errors simply', () => {
    it('tests async errors with one line', async () => {
      const failingFunction = async () => {
        throw new Error('Database connection failed');
      };
      
      // One line to test async errors
      const error = await expectError(
        failingFunction,
        Error,
        'Database connection'
      );
      
      expect(error.message).toContain('Database');
    });
    
    it('generates common filesystem errors', () => {
      // Generate realistic filesystem errors for testing
      const notFoundError = testErrors.fileNotFound('/missing.txt');
      const permissionError = testErrors.permissionDenied('/protected');
      
      expect(notFoundError.code).toBe('ENOENT');
      expect(notFoundError.path).toBe('/missing.txt');
      
      expect(permissionError.code).toBe('EACCES');
      expect(permissionError.path).toBe('/protected');
    });
  });
  
  describe('Using mock helpers', () => {
    it('creates pre-configured mocks', () => {
      // Before: Manual mock setup with 5+ lines
      // After: One line
      const logger = createMockLogger();
      
      // Use it like a real logger
      logger.info('Starting process');
      logger.success('Process completed');
      logger.error('Something went wrong');
      
      // Verify calls easily
      expect(logger.info).toHaveBeenCalledWith('Starting process');
      expect(logger.success).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalled();
    });
  });
  
  // Example of data-driven testing with testScenarios
  describe('Math operations', () => {
    const operations = [
      { name: 'adds positive numbers', input: [2, 3], expected: 5 },
      { name: 'adds negative numbers', input: [-2, -3], expected: -5 },
      { name: 'adds mixed numbers', input: [2, -3], expected: -1 }
    ];
    
    // This creates individual tests for each scenario
    testScenarios(operations, ([a, b]) => a + b);
  });
});

/**
 * Comparison: Before and After
 * 
 * BEFORE (without utilities):
 * - 15 lines to create a component with all fields
 * - 10 lines to set up mocks
 * - 5-10 lines to test errors properly
 * - Manual reset of each mock in beforeEach
 * Total: ~150 lines for a typical test file
 * 
 * AFTER (with utilities):
 * - 3 lines to create a component
 * - 1 line to create mocks
 * - 1 line to test errors
 * - 1 line to reset all mocks
 * Total: ~75 lines for the same test file
 * 
 * Result: 50% reduction in test code
 */