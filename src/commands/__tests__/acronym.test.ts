import { acronymCommand, AcronymManager } from '../acronym';
import { logger } from '../../lib/logger';
import { createTestFileSystem } from '../../lib/testing';

jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    space: jest.fn(),
  },
}));

describe('Acronym Command', () => {
  const mockProjectRoot = '/test/project';
  const mockAcronymsPath = '/test/project/.zcc/acronyms.json';
  let testFs: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create test filesystem
    testFs = await createTestFileSystem({
      '/test/project/.zcc/config.json': JSON.stringify({ version: '1.0.0' }, null, 2)
    });
  });

  describe('AcronymManager', () => {
    it('should initialize with default config when no file exists', () => {
      const manager = new AcronymManager(mockProjectRoot, testFs);
      const acronyms = manager.list();
      
      expect(acronyms).toEqual({});
    });

    it('should load existing config from file', async () => {
      const mockConfig = {
        acronyms: { 'API': 'Application Programming Interface' },
        settings: { caseSensitive: true, wholeWordOnly: false }
      };
      
      // Write config to test filesystem
      await testFs.writeFile(mockAcronymsPath, JSON.stringify(mockConfig, null, 2));
      
      const manager = new AcronymManager(mockProjectRoot, testFs);
      const acronyms = manager.list();
      
      expect(acronyms).toEqual(mockConfig.acronyms);
    });

    it('should add acronyms in uppercase when case insensitive', async () => {
      const manager = new AcronymManager(mockProjectRoot, testFs);
      manager.add('api', 'Application Programming Interface');
      
      // Verify the file was written to test filesystem
      const exists = await testFs.exists(mockAcronymsPath);
      expect(exists).toBe(true);
      
      const content = await testFs.readFile(mockAcronymsPath, 'utf-8');
      expect(content).toContain('"API": "Application Programming Interface"');
    });

    it('should preserve case when case sensitive', async () => {
      const mockConfig = {
        acronyms: {},
        settings: { caseSensitive: true, wholeWordOnly: true }
      };
      
      // Write initial config to test filesystem
      await testFs.writeFile(mockAcronymsPath, JSON.stringify(mockConfig, null, 2));
      
      const manager = new AcronymManager(mockProjectRoot, testFs);
      manager.add('Api', 'Application Programming Interface');
      
      const content = await testFs.readFile(mockAcronymsPath, 'utf-8');
      expect(content).toContain('"Api": "Application Programming Interface"');
    });

    it('should remove acronyms', async () => {
      const mockConfig = {
        acronyms: { 'API': 'Application Programming Interface' },
        settings: { caseSensitive: false, wholeWordOnly: true }
      };
      
      // Write initial config to test filesystem
      await testFs.writeFile(mockAcronymsPath, JSON.stringify(mockConfig, null, 2));
      
      const manager = new AcronymManager(mockProjectRoot, testFs);
      const removed = manager.remove('api');
      
      expect(removed).toBe(true);
      
      const content = await testFs.readFile(mockAcronymsPath, 'utf-8');
      expect(content).toContain('"acronyms": {}');
    });

  });

  describe('CLI commands (integration tests)', () => {
    // Note: These tests run against the real filesystem since the CLI commands 
    // directly use process.cwd() and don't accept a filesystem parameter.
    // The existing .zcc/acronyms.json file in this project contains:
    // { "acronyms": { "SSA": "Sonic Sub-Agents" }, "settings": { ... } }
    
    it('should add acronym via CLI', async () => {
      await acronymCommand.parseAsync(['node', 'test', 'add', 'api', 'Application Programming Interface']);
      
      expect(logger.success).toHaveBeenCalledWith('Added acronym: api → Application Programming Interface');
    });

    it('should remove acronym via CLI', async () => {
      await acronymCommand.parseAsync(['node', 'test', 'remove', 'nonexistent']);
      
      expect(logger.warn).toHaveBeenCalledWith('Acronym not found: nonexistent');
    });

    it('should list acronyms via CLI when acronyms exist', async () => {
      // The project has existing acronyms in .zcc/acronyms.json
      await acronymCommand.parseAsync(['node', 'test', 'list']);
      
      expect(logger.info).toHaveBeenCalledWith('Configured Acronyms:');
      expect(logger.space).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('  API → Application Programming Interface');
    });
  });

});