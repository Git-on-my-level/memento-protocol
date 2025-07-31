import { acronymCommand, AcronymManager } from '../acronym';
import * as fs from 'fs';
import { logger } from '../../lib/logger';

jest.mock('fs');
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
  const mockAcronymsPath = '/test/project/.memento/acronyms.json';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fs.existsSync to return false by default
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    // Mock fs.mkdirSync
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    
    // Mock fs.writeFileSync
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
  });

  describe('AcronymManager', () => {
    it('should initialize with default config when no file exists', () => {
      const manager = new AcronymManager(mockProjectRoot);
      const acronyms = manager.list();
      const settings = manager.getSettings();
      
      expect(acronyms).toEqual({});
      expect(settings).toEqual({
        caseSensitive: false,
        wholeWordOnly: true
      });
    });

    it('should load existing config from file', () => {
      const mockConfig = {
        acronyms: { 'API': 'Application Programming Interface' },
        settings: { caseSensitive: true, wholeWordOnly: false }
      };
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      
      const manager = new AcronymManager(mockProjectRoot);
      const acronyms = manager.list();
      const settings = manager.getSettings();
      
      expect(acronyms).toEqual(mockConfig.acronyms);
      expect(settings).toEqual(mockConfig.settings);
    });

    it('should add acronyms in uppercase when case insensitive', () => {
      const manager = new AcronymManager(mockProjectRoot);
      manager.add('api', 'Application Programming Interface');
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockAcronymsPath,
        expect.stringContaining('"API": "Application Programming Interface"')
      );
    });

    it('should preserve case when case sensitive', () => {
      const manager = new AcronymManager(mockProjectRoot);
      manager.updateSettings({ caseSensitive: true });
      manager.add('Api', 'Application Programming Interface');
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockAcronymsPath,
        expect.stringContaining('"Api": "Application Programming Interface"')
      );
    });

    it('should remove acronyms', () => {
      const mockConfig = {
        acronyms: { 'API': 'Application Programming Interface' },
        settings: { caseSensitive: false, wholeWordOnly: true }
      };
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      
      const manager = new AcronymManager(mockProjectRoot);
      const removed = manager.remove('api');
      
      expect(removed).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockAcronymsPath,
        expect.stringContaining('"acronyms": {}')
      );
    });

    it('should clear all acronyms', () => {
      const mockConfig = {
        acronyms: { 
          'API': 'Application Programming Interface',
          'CLI': 'Command Line Interface'
        },
        settings: { caseSensitive: false, wholeWordOnly: true }
      };
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      
      const manager = new AcronymManager(mockProjectRoot);
      manager.clear();
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockAcronymsPath,
        expect.stringContaining('"acronyms": {}')
      );
    });
  });

  describe('CLI commands', () => {
    it('should add acronym via CLI', async () => {
      await acronymCommand.parseAsync(['node', 'test', 'add', 'ssa', 'Sonic Sub-Agents']);
      
      expect(logger.success).toHaveBeenCalledWith('Added acronym: ssa → Sonic Sub-Agents');
    });

    it('should remove acronym via CLI', async () => {
      const mockConfig = {
        acronyms: { 'SSA': 'Sonic Sub-Agents' },
        settings: { caseSensitive: false, wholeWordOnly: true }
      };
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      
      await acronymCommand.parseAsync(['node', 'test', 'remove', 'ssa']);
      
      expect(logger.success).toHaveBeenCalledWith('Removed acronym: ssa');
    });

    it('should list acronyms via CLI', async () => {
      const mockConfig = {
        acronyms: { 
          'API': 'Application Programming Interface',
          'CLI': 'Command Line Interface'
        },
        settings: { caseSensitive: false, wholeWordOnly: true }
      };
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      
      await acronymCommand.parseAsync(['node', 'test', 'list']);
      
      expect(logger.info).toHaveBeenCalledWith('Configured Acronyms:');
      expect(logger.info).toHaveBeenCalledWith('  API → Application Programming Interface');
      expect(logger.info).toHaveBeenCalledWith('  CLI → Command Line Interface');
    });

    it('should show message when no acronyms configured', async () => {
      await acronymCommand.parseAsync(['node', 'test', 'list']);
      
      expect(logger.info).toHaveBeenCalledWith('No acronyms configured.');
    });

    it('should clear all acronyms via CLI', async () => {
      await acronymCommand.parseAsync(['node', 'test', 'clear']);
      
      expect(logger.success).toHaveBeenCalledWith('Cleared all acronyms.');
    });
  });
});