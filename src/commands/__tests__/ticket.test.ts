import { TicketManager } from '../../lib/ticketManager';
import { logger } from '../../lib/logger';
import inquirer from 'inquirer';

jest.mock('../../lib/ticketManager');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));
jest.mock('inquirer');

describe('Ticket Command', () => {
  let mockTicketManager: any;
  let originalExit: any;
  let ticketCommand: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTicketManager = {
      create: jest.fn(),
      list: jest.fn(),
      move: jest.fn(),
      delete: jest.fn()
    };
    
    (TicketManager as jest.MockedClass<typeof TicketManager>).mockImplementation(() => mockTicketManager);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
    
    // Reset process.exitCode
    process.exitCode = 0;
    
    // Import fresh module instance for each test to prevent Commander.js state pollution
    jest.isolateModules(() => {
      ticketCommand = require('../ticket').ticketCommand;
    });
  });

  afterEach(() => {
    process.exit = originalExit;
    process.exitCode = 0;
  });

  describe('create ticket', () => {
    describe('with CLI options', () => {
      it('should create ticket with all options specified', async () => {
        const ticketPath = '/project/.zcc/tickets/next/feature-ticket.md';
        mockTicketManager.create.mockResolvedValue(ticketPath);

        const result = ticketCommand.parseAsync([
          'node', 'test', 'create', 'feature-ticket', 
          '--type', 'feature', 
          '--priority', 'high',
          '--title', 'New Feature',
          '--description', 'A great feature',
          '--assignee', 'john.doe',
          '--tags', 'frontend,react'
        ]);

        await expect(result).resolves.not.toThrow();
        expect(mockTicketManager.create).toHaveBeenCalledWith('feature-ticket', {
          type: 'feature',
          title: 'New Feature',
          description: 'A great feature',
          priority: 'high',
          assignee: 'john.doe',
          tags: ['frontend', 'react']
        });
      });

      it('should handle invalid ticket type validation', async () => {
        const result = ticketCommand.parseAsync([
          'node', 'test', 'create', 'invalid-ticket', 
          '--type', 'invalid-type'
        ]);

        await expect(result).resolves.not.toThrow();
        expect(logger.error).toHaveBeenCalledWith('Failed to create ticket: Error: Invalid ticket type: invalid-type. Must be one of: feature, bug, task, refactor');
        expect(process.exitCode).toBe(1);
      });

      it('should handle invalid priority validation', async () => {
        const result = ticketCommand.parseAsync([
          'node', 'test', 'create', 'invalid-priority-ticket', 
          '--type', 'task',
          '--priority', 'super-high'
        ]);

        await expect(result).resolves.not.toThrow();
        expect(logger.error).toHaveBeenCalledWith('Failed to create ticket: Error: Invalid priority: super-high. Must be one of: low, medium, high, critical');
        expect(process.exitCode).toBe(1);
      });

      it('should handle empty tags correctly', async () => {
        const ticketPath = '/project/.zcc/tickets/next/empty-tags.md';
        mockTicketManager.create.mockResolvedValue(ticketPath);

        const result = ticketCommand.parseAsync([
          'node', 'test', 'create', 'empty-tags',
          '--type', 'task',
          '--tags', ' , , frontend, , backend , '
        ]);

        await expect(result).resolves.not.toThrow();
        expect(mockTicketManager.create).toHaveBeenCalledWith('empty-tags', {
          type: 'task',
          title: undefined,
          description: undefined,
          priority: 'medium',
          assignee: undefined,
          tags: ['frontend', 'backend']
        });
      });

      it.each([
        'feature',
        'bug', 
        'task',
        'refactor'
      ])('should create %s ticket type correctly', async (type) => {
        const ticketPath = `/project/.zcc/tickets/next/${type}-ticket.md`;
        mockTicketManager.create.mockResolvedValue(ticketPath);

        const result = ticketCommand.parseAsync([
          'node', 'test', 'create', `${type}-ticket`, 
          '--type', type
        ]);

        await expect(result).resolves.not.toThrow();
        expect(mockTicketManager.create).toHaveBeenCalledWith(`${type}-ticket`, {
          type,
          title: undefined,
          description: undefined,
          priority: 'medium',
          assignee: undefined,
          tags: []
        });
      });
    });

    describe('with interactive prompts', () => {
      it('should create ticket using interactive prompts', async () => {
        const ticketPath = '/project/.zcc/tickets/next/interactive-ticket.md';
        mockTicketManager.create.mockResolvedValue(ticketPath);
        
        (inquirer.prompt as unknown as jest.Mock).mockResolvedValue({
          type: 'bug',
          title: 'Fix Authentication Bug',
          description: 'Users cannot login properly',
          priority: 'critical',
          assignee: 'jane.smith',
          tags: 'auth, security, urgent'
        });

        const result = ticketCommand.parseAsync(['node', 'test', 'create', 'interactive-ticket', '--interactive']);

        await expect(result).resolves.not.toThrow();
        expect(inquirer.prompt).toHaveBeenCalled();
        expect(mockTicketManager.create).toHaveBeenCalledWith('interactive-ticket', {
          type: 'bug',
          title: 'Fix Authentication Bug',
          description: 'Users cannot login properly',
          priority: 'critical',
          assignee: 'jane.smith',
          tags: ['auth', 'security', 'urgent']
        });
      });

      it('should trigger interactive mode when no type is specified', async () => {
        const ticketPath = '/project/.zcc/tickets/next/no-type-ticket.md';
        mockTicketManager.create.mockResolvedValue(ticketPath);
        
        (inquirer.prompt as unknown as jest.Mock).mockResolvedValue({
          type: 'task',
          title: 'Auto Interactive Ticket',
          description: '',
          priority: 'medium',
          assignee: '',
          tags: ''
        });

        const result = ticketCommand.parseAsync(['node', 'test', 'create', 'no-type-ticket']);

        await expect(result).resolves.not.toThrow();
        expect(inquirer.prompt).toHaveBeenCalled();
        expect(mockTicketManager.create).toHaveBeenCalledWith('no-type-ticket', {
          type: 'task',
          title: 'Auto Interactive Ticket',
          description: '',
          priority: 'medium',
          assignee: '',
          tags: []
        });
      });

      it('should handle validation error in interactive mode', async () => {
        (inquirer.prompt as unknown as jest.Mock).mockResolvedValue({
          type: 'invalid-type',
          title: 'Invalid Type Ticket',
          description: '',
          priority: 'medium',
          assignee: '',
          tags: ''
        });

        const result = ticketCommand.parseAsync(['node', 'test', 'create', 'invalid-interactive', '--interactive']);

        await expect(result).resolves.not.toThrow();
        expect(logger.error).toHaveBeenCalledWith('Failed to create ticket: Error: Invalid ticket type: invalid-type. Must be one of: feature, bug, task, refactor');
        expect(process.exitCode).toBe(1);
      });
    });

    it('should handle creation errors from TicketManager', async () => {
      mockTicketManager.create.mockRejectedValue(new Error('Ticket already exists'));

      const result = ticketCommand.parseAsync(['node', 'test', 'create', 'existing-ticket', '--type', 'task']);

      await expect(result).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith('Failed to create ticket: Error: Ticket already exists');
      expect(process.exitCode).toBe(1);
    });
  });

  describe('list tickets', () => {
    it('should list all tickets grouped by status', async () => {
      const mockTickets = [
        { name: 'Feature A', status: 'next' },
        { name: 'Bug fix', status: 'in-progress' },
        { name: 'Old task', status: 'done' }
      ];
      mockTicketManager.list.mockResolvedValue(mockTickets);

      const result = ticketCommand.parseAsync(['node', 'test', 'list']);

      await expect(result).resolves.not.toThrow();
      expect(mockTicketManager.list).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('\nnext:');
      expect(logger.info).toHaveBeenCalledWith('  - Feature A');
      expect(logger.info).toHaveBeenCalledWith('\nin-progress:');
      expect(logger.info).toHaveBeenCalledWith('  - Bug fix');
      expect(logger.info).toHaveBeenCalledWith('\ndone:');
      expect(logger.info).toHaveBeenCalledWith('  - Old task');
    });

    it('should handle empty ticket list', async () => {
      mockTicketManager.list.mockResolvedValue([]);

      const result = ticketCommand.parseAsync(['node', 'test', 'list']);

      await expect(result).resolves.not.toThrow();
      expect(logger.info).toHaveBeenCalledWith('No tickets found.');
    });

    it('should handle list errors', async () => {
      mockTicketManager.list.mockRejectedValue(new Error('Read error'));

      const result = ticketCommand.parseAsync(['node', 'test', 'list']);

      await expect(result).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith('Failed to list tickets: Error: Read error');
      expect(process.exitCode).toBe(1);
    });
  });

  describe('move ticket', () => {
    it('should move ticket to new status', async () => {
      mockTicketManager.move.mockResolvedValue(undefined);

      const result = ticketCommand.parseAsync(['node', 'test', 'move', 'Feature A', 'in-progress']);

      await expect(result).resolves.not.toThrow();
      expect(mockTicketManager.move).toHaveBeenCalledWith('Feature A', 'in-progress');
      expect(logger.success).toHaveBeenCalledWith("Moved ticket 'Feature A' to in-progress");
    });

    it('should validate status parameter', async () => {
      const result = ticketCommand.parseAsync(['node', 'test', 'move', 'Feature A', 'invalid-status']);

      await expect(result).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith('Invalid status: invalid-status. Must be one of: next, in-progress, done');
      expect(process.exitCode).toBe(1);
    });

    it('should handle move errors', async () => {
      mockTicketManager.move.mockRejectedValue(new Error('Ticket not found'));

      const result = ticketCommand.parseAsync(['node', 'test', 'move', 'Nonexistent', 'done']);

      await expect(result).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith('Failed to move ticket: Error: Ticket not found');
      expect(process.exitCode).toBe(1);
    });
  });

  describe('delete ticket', () => {
    it('should delete a ticket', async () => {
      mockTicketManager.delete.mockResolvedValue(undefined);

      const result = ticketCommand.parseAsync(['node', 'test', 'delete', 'Old ticket']);

      await expect(result).resolves.not.toThrow();
      expect(mockTicketManager.delete).toHaveBeenCalledWith('Old ticket');
      expect(logger.success).toHaveBeenCalledWith('Deleted ticket: Old ticket');
    });

    it('should handle delete errors', async () => {
      mockTicketManager.delete.mockRejectedValue(new Error('Ticket not found'));

      const result = ticketCommand.parseAsync(['node', 'test', 'delete', 'Nonexistent']);

      await expect(result).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith('Failed to delete ticket: Error: Ticket not found');
      expect(process.exitCode).toBe(1);
    });
  });
});