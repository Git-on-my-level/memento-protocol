/**
 * Tests for the simple test utilities
 */

import {
  createTestComponent,
  createTestPackManifest,
  createTestConfig,
  createMockLogger,
  createMockInquirer,
  expectError,
  testErrors,
  waitFor,
  testScenarios
} from '../index';

describe('Simple Test Utilities', () => {
  describe('Test Data Factories', () => {
    it('should create test component with defaults', () => {
      const component = createTestComponent();
      expect(component.name).toBe('test-component');
      expect(component.type).toBe('mode');
      expect(component.metadata.description).toBe('Test component description');
    });

    it('should allow overriding component properties', () => {
      const component = createTestComponent({
        name: 'custom-component',
        type: 'workflow'
      });
      expect(component.name).toBe('custom-component');
      expect(component.type).toBe('workflow');
    });

    it('should create test pack manifest', () => {
      const manifest = createTestPackManifest({
        name: 'my-pack',
        components: {
          modes: [{ name: 'test-mode', required: true }],
          workflows: [],
          agents: []
        }
      });
      expect(manifest.name).toBe('my-pack');
      expect(manifest.components.modes).toHaveLength(1);
    });

    it('should create test config', () => {
      const config = createTestConfig({ defaultMode: 'architect' });
      expect(config.defaultMode).toBe('architect');
      expect(config.ui?.colorOutput).toBe(true);
    });
  });

  describe('Mock Helpers', () => {
    it('should create mock logger', () => {
      const logger = createMockLogger();
      logger.info('test');
      logger.error('error');
      
      expect(logger.info).toHaveBeenCalledWith('test');
      expect(logger.error).toHaveBeenCalledWith('error');
    });

    it('should create mock inquirer with responses', async () => {
      const inquirer = createMockInquirer({
        confirm: true,
        mode: 'engineer'
      });
      
      const result = await inquirer.prompt([
        { name: 'confirm', type: 'confirm' },
        { name: 'mode', type: 'list' }
      ]);
      
      expect(result.confirm).toBe(true);
      expect(result.mode).toBe('engineer');
    });
  });

  describe('Error Helpers', () => {
    it('should catch async errors', async () => {
      const error = await expectError(
        async () => { throw new Error('Test error'); },
        Error,
        'Test error'
      );
      expect(error.message).toBe('Test error');
    });

    it('should create filesystem errors', () => {
      const error = testErrors.fileNotFound('/missing.txt');
      expect(error.code).toBe('ENOENT');
      expect(error.path).toBe('/missing.txt');
    });
  });

  describe('Test Helpers', () => {
    it('should wait for condition', async () => {
      let counter = 0;
      const incrementer = setInterval(() => counter++, 10);
      
      await waitFor(() => counter >= 3, 1000, 10);
      clearInterval(incrementer);
      
      expect(counter).toBeGreaterThanOrEqual(3);
    });

    it('should timeout if condition not met', async () => {
      await expect(
        waitFor(() => false, 100, 10)
      ).rejects.toThrow('Timeout waiting for condition');
    });

    it('should have testScenarios helper available', () => {
      // testScenarios is meant to be used at the describe level, not inside a test
      // Just verify it exists and is a function
      expect(testScenarios).toBeDefined();
      expect(typeof testScenarios).toBe('function');
    });
  });
});