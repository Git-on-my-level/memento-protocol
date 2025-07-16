import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DirectoryManager } from '../../lib/directoryManager';
import { AgentFileGenerator } from '../../lib/agentFileGenerator';
import { InteractiveSetup } from '../../lib/interactiveSetup';
import { ConfigManager } from '../../lib/configManager';
import { addAgentCommand } from '../add-agent';
import inquirer from 'inquirer';

// Mock external dependencies
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    space: jest.fn(),
  },
}));

// Mock DirectoryManager to avoid permission issues in tests
jest.mock('../../lib/directoryManager', () => {
  const actual = jest.requireActual('../../lib/directoryManager');
  return {
    ...actual,
    DirectoryManager: jest.fn().mockImplementation((projectRoot: string) => ({
      projectRoot,
      isInitialized: jest.fn().mockReturnValue(true),
      initializeStructure: jest.fn().mockResolvedValue(undefined),
      ensureGitignore: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

// Mock ComponentInstaller
jest.mock('../../lib/componentInstaller', () => ({
  ComponentInstaller: jest.fn().mockImplementation(() => ({
    installComponent: jest.fn().mockResolvedValue(undefined),
    listAvailableComponents: jest.fn().mockResolvedValue({
      modes: [],
      workflows: []
    })
  }))
}));

describe('Multi-Agent Implementation Tests', () => {
  const testProjectRoot = path.join(__dirname, 'test-multi-agent-project');
  let dirManager: DirectoryManager;
  let configManager: ConfigManager;

  beforeEach(async () => {
    // Create test project structure
    await fs.mkdir(testProjectRoot, { recursive: true });
    await fs.mkdir(path.join(testProjectRoot, '.memento'), { recursive: true });
    await fs.mkdir(path.join(testProjectRoot, 'templates', 'agents'), { recursive: true });
    
    // Copy agent templates and metadata from the main project
    const sourceTemplatesDir = path.join(process.cwd(), 'templates', 'agents');
    const targetTemplatesDir = path.join(testProjectRoot, 'templates', 'agents');
    
    // Copy metadata
    await fs.copyFile(
      path.join(sourceTemplatesDir, 'metadata.json'),
      path.join(targetTemplatesDir, 'metadata.json')
    );
    
    // Copy templates
    for (const templateFile of ['claude.md', 'cursor.md', 'gemini.md']) {
      await fs.copyFile(
        path.join(sourceTemplatesDir, templateFile),
        path.join(targetTemplatesDir, templateFile)
      );
    }
    
    dirManager = new DirectoryManager(testProjectRoot);
    configManager = new ConfigManager(testProjectRoot);
    
    // Initialize basic config
    await configManager.save({
      defaultMode: 'engineer',
      components: {
        modes: ['engineer', 'architect'],
        workflows: ['review']
      },
      agents: []
    });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testProjectRoot, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  describe('Interactive Setup - Agent Selection', () => {
    it('should allow selecting multiple agents during interactive setup', async () => {
      const interactiveSetup = new InteractiveSetup(testProjectRoot);
      
      // Mock the component installer response
      const mockListAvailableComponents = jest.fn(() => Promise.resolve({
        modes: [
          { name: 'engineer', description: 'Implementation', tags: [], dependencies: [] },
          { name: 'architect', description: 'Design', tags: [], dependencies: [] }
        ],
        workflows: [
          { name: 'review', description: 'Code review', tags: [], dependencies: [] }
        ]
      }));
      
      (interactiveSetup as any).componentInstaller.listAvailableComponents = mockListAvailableComponents;
      
      // Mock inquirer responses
      const mockPrompt = inquirer.prompt as jest.MockedFunction<typeof inquirer.prompt>;
      mockPrompt
        .mockResolvedValueOnce({ confirmed: true }) // Confirm project type
        .mockResolvedValueOnce({ selectedAgents: ['claude', 'cursor', 'gemini'] }) // Select all agents
        .mockResolvedValueOnce({ selectedModes: ['engineer', 'architect'] }) // Select modes
        .mockResolvedValueOnce({ selectedWorkflows: ['review'] }) // Select workflows
        .mockResolvedValueOnce({ defaultMode: 'engineer' }) // Default mode
        .mockResolvedValueOnce({ addToGitignore: false }) // Gitignore
        .mockResolvedValueOnce({ confirmed: true }); // Confirm setup

      const result = await interactiveSetup.run({
        type: 'fullstack',
        framework: 'nextjs',
        suggestedModes: ['engineer'],
        suggestedWorkflows: ['review'],
        files: [],
        dependencies: {}
      });

      expect(result.selectedAgents).toEqual(['claude', 'cursor', 'gemini']);
    });

    it('should default to claude for quick setup', async () => {
      const interactiveSetup = new InteractiveSetup(testProjectRoot);
      
      const result = await interactiveSetup.quickSetup({
        type: 'web',
        suggestedModes: ['engineer'],
        suggestedWorkflows: ['review'],
        files: [],
        dependencies: {}
      });

      expect(result.selectedAgents).toEqual(['claude']);
    });
  });

  describe('Agent File Generation', () => {
    it('should generate files for selected agents', async () => {
      const agentGenerator = new AgentFileGenerator(testProjectRoot);
      const agentMetadata = await AgentFileGenerator.loadAgentMetadata(testProjectRoot);
      
      const placeholderValues = {
        PROJECT_NAME: 'Test Project',
        PROJECT_DESCRIPTION: 'A test project for multi-agent support',
        DEFAULT_MODE: 'engineer',
        TECH_STACK: 'TypeScript, Node.js',
        PRIMARY_LANGUAGE: 'TypeScript'
      };
      
      // Generate files for each agent
      for (const agentId of ['claude', 'cursor', 'gemini']) {
        const agentConfig = agentMetadata[agentId];
        await agentGenerator.generate(agentConfig, placeholderValues);
      }
      
      // Verify files were created
      expect(await agentGenerator.exists('CLAUDE.md')).toBe(true);
      expect(await agentGenerator.exists('.cursorrules')).toBe(true);
      expect(await agentGenerator.exists('GEMINI.md')).toBe(true);
      
      // Verify content contains replaced placeholders
      const claudeContent = await fs.readFile(path.join(testProjectRoot, 'CLAUDE.md'), 'utf-8');
      expect(claudeContent).toContain('Test Project');
      expect(claudeContent).toContain('engineer');
      
      const cursorContent = await fs.readFile(path.join(testProjectRoot, '.cursorrules'), 'utf-8');
      expect(cursorContent).toContain('Test Project');
      expect(cursorContent).toContain('TypeScript, Node.js');
      
      const geminiContent = await fs.readFile(path.join(testProjectRoot, 'GEMINI.md'), 'utf-8');
      expect(geminiContent).toContain('Test Project');
      expect(geminiContent).toContain('TypeScript');
    });

    it('should inject dynamic content for Claude', async () => {
      const agentGenerator = new AgentFileGenerator(testProjectRoot);
      const agentMetadata = await AgentFileGenerator.loadAgentMetadata(testProjectRoot);
      
      // Create mode files to test dynamic listing
      await fs.mkdir(path.join(testProjectRoot, '.memento', 'modes'), { recursive: true });
      await fs.writeFile(path.join(testProjectRoot, '.memento', 'modes', 'engineer.md'), '# Engineer Mode');
      await fs.writeFile(path.join(testProjectRoot, '.memento', 'modes', 'architect.md'), '# Architect Mode');
      
      const placeholderValues = {
        PROJECT_NAME: 'Test Project',
        // Don't provide MODES_LIST to test dynamic generation
      };
      
      const claudeConfig = agentMetadata['claude'];
      await agentGenerator.generate(claudeConfig, placeholderValues);
      
      const content = await fs.readFile(path.join(testProjectRoot, 'CLAUDE.md'), 'utf-8');
      // Should contain dynamically generated modes list
      expect(content).toMatch(/`engineer`.*-/);
      expect(content).toMatch(/`architect`.*-/);
    });
  });

  describe('add-agent Command', () => {
    beforeEach(async () => {
      // Ensure project is "initialized"
      try {
        await dirManager.initializeStructure();
      } catch (error) {
        // If it fails, create the directory manually
        await fs.mkdir(path.join(testProjectRoot, '.memento'), { recursive: true });
      }
    });

    it('should add a single agent via command line', async () => {
      // Mock process.cwd to return our test directory
      const originalCwd = process.cwd;
      process.cwd = jest.fn().mockReturnValue(testProjectRoot) as any;
      
      // Execute the command programmatically
      await addAgentCommand.parseAsync(['node', 'test', 'claude']);
      
      // Verify file was created
      const claudeExists = await fs.access(path.join(testProjectRoot, 'CLAUDE.md'))
        .then(() => true)
        .catch(() => false);
      expect(claudeExists).toBe(true);
      
      // Verify config was updated
      const config = await configManager.load();
      expect(config.agents).toContain('claude');
      
      // Restore process.cwd
      process.cwd = originalCwd;
    });

    it('should add all agents with --all flag', async () => {
      const originalCwd = process.cwd;
      process.cwd = jest.fn().mockReturnValue(testProjectRoot) as any;
      
      await addAgentCommand.parseAsync(['node', 'test', '--all']);
      
      // Verify all files were created
      const filesExist = await Promise.all([
        fs.access(path.join(testProjectRoot, 'CLAUDE.md')).then(() => true).catch(() => false),
        fs.access(path.join(testProjectRoot, '.cursorrules')).then(() => true).catch(() => false),
        fs.access(path.join(testProjectRoot, 'GEMINI.md')).then(() => true).catch(() => false)
      ]);
      
      expect(filesExist).toEqual([true, true, true]);
      
      // Verify config contains all agents
      const config = await configManager.load();
      expect(config.agents).toEqual(expect.arrayContaining(['claude', 'cursor', 'gemini']));
      
      process.cwd = originalCwd;
    });

    it('should allow interactive agent selection', async () => {
      const originalCwd = process.cwd;
      process.cwd = jest.fn().mockReturnValue(testProjectRoot) as any;
      
      // Mock inquirer to select cursor and gemini
      const mockPrompt = inquirer.prompt as jest.MockedFunction<typeof inquirer.prompt>;
      mockPrompt.mockResolvedValueOnce({ selectedAgents: ['cursor', 'gemini'] });
      
      await addAgentCommand.parseAsync(['node', 'test']);
      
      // Verify selected files were created
      const cursorExists = await fs.access(path.join(testProjectRoot, '.cursorrules'))
        .then(() => true).catch(() => false);
      const geminiExists = await fs.access(path.join(testProjectRoot, 'GEMINI.md'))
        .then(() => true).catch(() => false);
      const claudeExists = await fs.access(path.join(testProjectRoot, 'CLAUDE.md'))
        .then(() => true).catch(() => false);
      
      expect(cursorExists).toBe(true);
      expect(geminiExists).toBe(true);
      expect(claudeExists).toBe(false); // Should not exist
      
      process.cwd = originalCwd;
    });

    it('should respect --force flag for overwriting', async () => {
      const originalCwd = process.cwd;
      process.cwd = jest.fn().mockReturnValue(testProjectRoot) as any;
      
      // Create existing file
      await fs.writeFile(path.join(testProjectRoot, 'CLAUDE.md'), 'Old content');
      
      // Try without force - should skip
      await addAgentCommand.parseAsync(['node', 'test', 'claude']);
      let content = await fs.readFile(path.join(testProjectRoot, 'CLAUDE.md'), 'utf-8');
      expect(content).toBe('Old content');
      
      // Try with force - should overwrite
      await addAgentCommand.parseAsync(['node', 'test', 'claude', '--force']);
      content = await fs.readFile(path.join(testProjectRoot, 'CLAUDE.md'), 'utf-8');
      expect(content).not.toBe('Old content');
      expect(content).toContain('Memento Protocol Router'); // Should contain new content
      
      process.cwd = originalCwd;
    });
  });

  describe('Configuration Management', () => {
    it('should save selected agents to config during init', async () => {
      const interactiveSetup = new InteractiveSetup(testProjectRoot);
      
      await interactiveSetup.applySetup({
        projectInfo: {} as any,
        selectedModes: ['engineer'],
        selectedWorkflows: ['review'],
        selectedAgents: ['claude', 'cursor'],
        defaultMode: 'engineer'
      });
      
      const config = await configManager.load();
      expect(config.agents).toEqual(['claude', 'cursor']);
    });

    it('should merge agents when adding new ones', async () => {
      // Start with claude
      await configManager.save({
        defaultMode: 'engineer',
        components: { modes: [], workflows: [] },
        agents: ['claude']
      });
      
      const originalCwd = process.cwd;
      process.cwd = jest.fn().mockReturnValue(testProjectRoot) as any;
      
      // Add cursor
      await addAgentCommand.parseAsync(['node', 'test', 'cursor']);
      
      const config = await configManager.load();
      expect(config.agents).toEqual(['claude', 'cursor']);
      
      process.cwd = originalCwd;
    });
  });

  describe('Error Handling', () => {
    it('should handle missing templates gracefully', async () => {
      const agentGenerator = new AgentFileGenerator(testProjectRoot);
      
      // Remove template file
      await fs.unlink(path.join(testProjectRoot, 'templates', 'agents', 'claude.md'));
      
      const agentConfig = {
        id: 'claude',
        name: 'Claude',
        description: 'Test',
        targetFilename: 'CLAUDE.md',
        templatePath: 'templates/agents/claude.md',
        placeholders: {}
      };
      
      await expect(
        agentGenerator.generate(agentConfig, {})
      ).rejects.toThrow('Agent template not found');
    });

    it('should validate agent names in add-agent command', async () => {
      const originalCwd = process.cwd;
      process.cwd = jest.fn().mockReturnValue(testProjectRoot) as any;
      
      // Mock console methods to capture output
      const originalLog = console.log;
      const originalError = console.error;
      const logs: string[] = [];
      console.log = jest.fn((...args) => logs.push(args.join(' ')));
      console.error = jest.fn((...args) => logs.push(args.join(' ')));
      
      await addAgentCommand.parseAsync(['node', 'test', 'invalid-agent']);
      
      // Check that error was logged
      expect(logs.some(log => log.includes('Invalid agent: invalid-agent'))).toBe(true);
      
      // Restore
      console.log = originalLog;
      console.error = originalError;
      process.cwd = originalCwd;
    });
  });
});