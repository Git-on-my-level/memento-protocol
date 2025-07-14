import { Command } from 'commander';

// Mock all commands before importing cli
jest.mock('../commands/init', () => ({
  initCommand: new Command('init').description('Initialize')
}));
jest.mock('../commands/add', () => ({
  addCommand: new Command('add').description('Add component')
}));
jest.mock('../commands/list', () => ({
  listCommand: new Command('list').description('List components')
}));
jest.mock('../commands/ticket', () => ({
  ticketCommand: new Command('ticket').description('Manage tickets')
}));
jest.mock('../commands/config', () => ({
  configCommand: new Command('config').description('Manage config')
}));
jest.mock('../commands/update', () => ({
  createUpdateCommand: () => new Command('update').description('Update components')
}));
jest.mock('../commands/language', () => ({
  createLanguageCommand: () => new Command('language').description('Manage languages')
}));

describe('CLI', () => {
  let originalArgv: string[];
  let consoleLogSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    originalArgv = process.argv;
    jest.clearAllMocks();
    jest.resetModules(); // Reset module cache
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    process.argv = originalArgv;
    consoleLogSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should register all commands', () => {
    process.argv = ['node', 'memento', '--help'];
    require('../cli');

    // Commands are registered when the CLI is imported
    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('init');
    expect(output).toContain('add');
    expect(output).toContain('list');
    expect(output).toContain('ticket');
    expect(output).toContain('config');
    expect(output).toContain('update');
    expect(output).toContain('language');
  });

  it('should show help when no command provided', () => {
    process.argv = ['node', 'memento'];
    require('../cli');

    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Usage:');
    expect(output).toContain('A lightweight meta-framework for Claude Code');
  });

  it('should show version', () => {
    process.argv = ['node', 'memento', '--version'];
    require('../cli');

    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('0.1.0');
  });
});