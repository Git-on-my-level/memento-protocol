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

  describe('Bulk Operations', () => {
    it('should add multiple acronyms at once', () => {
      const manager = new AcronymManager(mockProjectRoot);
      const bulkAcronyms = {
        'API': 'Application Programming Interface',
        'CLI': 'Command Line Interface',
        'JSON': 'JavaScript Object Notation'
      };
      
      manager.bulkAdd(bulkAcronyms);
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockAcronymsPath,
        expect.stringContaining('"API": "Application Programming Interface"')
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockAcronymsPath,
        expect.stringContaining('"CLI": "Command Line Interface"')
      );
    });

    it('should import from text format', () => {
      const manager = new AcronymManager(mockProjectRoot);
      const textContent = 'API: Application Programming Interface\nCLI: Command Line Interface\nJSON=JavaScript Object Notation';
      
      const result = manager.importFromText(textContent);
      
      expect(result.imported).toBe(3);
      expect(result.skipped).toHaveLength(0);
    });

    it('should skip invalid lines when importing from text', () => {
      const manager = new AcronymManager(mockProjectRoot);
      const textContent = 'API: Application Programming Interface\ninvalid line\nCLI: Command Line Interface';
      
      const result = manager.importFromText(textContent);
      
      expect(result.imported).toBe(2);
      expect(result.skipped).toContain('invalid line');
    });

    it('should import from JSON format', () => {
      const manager = new AcronymManager(mockProjectRoot);
      const jsonContent = JSON.stringify({
        'API': 'Application Programming Interface',
        'CLI': 'Command Line Interface'
      });
      
      const result = manager.importFromJson(jsonContent);
      
      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should import from preset JSON format', () => {
      const manager = new AcronymManager(mockProjectRoot);
      const presetContent = JSON.stringify({
        name: 'Test Preset',
        description: 'Test preset for testing',
        acronyms: {
          'API': 'Application Programming Interface',
          'CLI': 'Command Line Interface'
        }
      });
      
      const result = manager.importFromJson(presetContent);
      
      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle JSON import errors gracefully', () => {
      const manager = new AcronymManager(mockProjectRoot);
      const invalidJson = 'not valid json';
      
      const result = manager.importFromJson(invalidJson);
      
      expect(result.imported).toBe(0);
      expect(result.errors).toContain('Invalid JSON format');
    });

    it('should export to text format', () => {
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
      const textExport = manager.exportToText();
      
      expect(textExport).toContain('API: Application Programming Interface');
      expect(textExport).toContain('CLI: Command Line Interface');
    });

    it('should export to JSON format', () => {
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
      const jsonExport = manager.exportToJson();
      const parsed = JSON.parse(jsonExport);
      
      expect(parsed.acronyms).toEqual(mockConfig.acronyms);
      expect(parsed.settings).toBeUndefined(); // settings not included by default
    });

    it('should export to JSON format with settings', () => {
      const mockConfig = {
        acronyms: {
          'API': 'Application Programming Interface'
        },
        settings: { caseSensitive: true, wholeWordOnly: false }
      };
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      
      const manager = new AcronymManager(mockProjectRoot);
      const jsonExport = manager.exportToJson(true);
      const parsed = JSON.parse(jsonExport);
      
      expect(parsed.acronyms).toEqual(mockConfig.acronyms);
      expect(parsed.settings).toEqual(mockConfig.settings);
    });

    it('should load preset when file exists', () => {
      const presetData = {
        name: 'Test Preset',
        description: 'Test description',
        acronyms: {
          'API': 'Application Programming Interface',
          'REST': 'Representational State Transfer'
        }
      };
      
      // Mock preset file exists
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('webdev.json');
      });
      
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(presetData));
      
      const manager = new AcronymManager(mockProjectRoot);
      const result = manager.loadPreset('webdev');
      
      expect(result.loaded).toBe(2);
      expect(result.preset).toBe('webdev');
      expect(result.error).toBeUndefined();
    });

    it('should handle preset not found error', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const manager = new AcronymManager(mockProjectRoot);
      const result = manager.loadPreset('nonexistent');
      
      expect(result.loaded).toBe(0);
      expect(result.preset).toBe('nonexistent');
      expect(result.error).toContain('not found');
    });

    it('should list available presets', () => {
      const presetData1 = {
        name: 'Web Development',
        description: 'Web dev acronyms',
        acronyms: { 'API': 'Application Programming Interface' }
      };
      
      const presetData2 = {
        name: 'DevOps',
        description: 'DevOps acronyms',
        acronyms: { 'K8s': 'Kubernetes' }
      };
      
      (fs.existsSync as jest.Mock).mockImplementation((dirPath: string) => {
        return dirPath.includes('templates/acronyms');
      });
      
      (fs.readdirSync as jest.Mock).mockReturnValue(['webdev.json', 'devops.json']);
      
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('webdev.json')) {
          return JSON.stringify(presetData1);
        }
        if (filePath.includes('devops.json')) {
          return JSON.stringify(presetData2);
        }
        return '{}';
      });
      
      const manager = new AcronymManager(mockProjectRoot);
      const presets = manager.listAvailablePresets();
      
      expect(presets).toHaveLength(2);
      expect(presets[0]).toEqual({ name: 'webdev', description: 'Web dev acronyms' });
      expect(presets[1]).toEqual({ name: 'devops', description: 'DevOps acronyms' });
    });
  });

  describe('CLI Import/Export Commands', () => {
    it('should import from file via CLI', async () => {
      const textContent = 'API: Application Programming Interface\nCLI: Command Line Interface';
      
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath === 'test.txt';
      });
      
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath === 'test.txt') {
          return textContent;
        }
        return '{}';
      });
      
      await acronymCommand.parseAsync(['node', 'test', 'import', 'test.txt']);
      
      expect(logger.success).toHaveBeenCalledWith('Imported 2 acronyms from test.txt');
    });

    it('should export to stdout via CLI', async () => {
      const mockConfig = {
        acronyms: {
          'API': 'Application Programming Interface',
          'CLI': 'Command Line Interface'
        },
        settings: { caseSensitive: false, wholeWordOnly: true }
      };
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      await acronymCommand.parseAsync(['node', 'test', 'export']);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API: Application Programming Interface')
      );
      
      consoleSpy.mockRestore();
    });

    it('should use preset via CLI', async () => {
      const presetData = {
        name: 'Web Development',
        description: 'Web dev acronyms',
        acronyms: {
          'API': 'Application Programming Interface',
          'REST': 'Representational State Transfer'
        }
      };
      
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('webdev.json');
      });
      
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(presetData));
      
      await acronymCommand.parseAsync(['node', 'test', 'use', 'webdev']);
      
      expect(logger.success).toHaveBeenCalledWith("Loaded 2 acronyms from 'webdev' preset");
    });

    it('should list presets via CLI', async () => {
      const presetData = {
        name: 'Web Development',
        description: 'Common web dev acronyms'
      };
      
      (fs.existsSync as jest.Mock).mockImplementation((dirPath: string) => {
        return dirPath.includes('templates/acronyms');
      });
      
      (fs.readdirSync as jest.Mock).mockReturnValue(['webdev.json']);
      
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        ...presetData,
        acronyms: { 'API': 'Application Programming Interface' }
      }));
      
      await acronymCommand.parseAsync(['node', 'test', 'presets']);
      
      expect(logger.info).toHaveBeenCalledWith('Available preset collections:');
      expect(logger.info).toHaveBeenCalledWith('  webdev - Common web dev acronyms');
    });
  });
});