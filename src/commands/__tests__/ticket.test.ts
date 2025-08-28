import { ticketCommand } from '../ticket';
import { TicketManager } from '../../lib/ticketManager';
import { logger } from '../../lib/logger';

jest.mock('../../lib/ticketManager');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    progress: jest.fn(),
    clearProgress: jest.fn(),
    step: jest.fn(),
  }
}));

describe('Ticket Command', () => {
  let mockTicketManager: any;
  let originalExit: any;

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
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('create ticket', () => {
    it('should create a new ticket', async () => {
      const ticketPath = '/project/.memento/tickets/next/Add new feature.md';
      mockTicketManager.create.mockResolvedValue(ticketPath);

      await ticketCommand.parseAsync(['node', 'test', 'create', 'Add new feature']);

      expect(mockTicketManager.create).toHaveBeenCalledWith('Add new feature');
      expect(logger.success).toHaveBeenCalledWith('Created ticket: Add new feature');
      expect(logger.info).toHaveBeenCalledWith(`Location: ${ticketPath}`);
    });

    it('should handle creation errors', async () => {
      mockTicketManager.create.mockRejectedValue(new Error('Ticket already exists'));

      await ticketCommand.parseAsync(['node', 'test', 'create', 'Existing ticket']);

      expect(logger.error).toHaveBeenCalledWith('Failed to create ticket: Error: Ticket already exists');
      expect(process.exit).toHaveBeenCalledWith(1);
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

      await ticketCommand.parseAsync(['node', 'test', 'list']);

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

      await ticketCommand.parseAsync(['node', 'test', 'list']);

      expect(logger.info).toHaveBeenCalledWith('No tickets found.');
    });

    it('should handle list errors', async () => {
      mockTicketManager.list.mockRejectedValue(new Error('Read error'));

      await ticketCommand.parseAsync(['node', 'test', 'list']);

      expect(logger.error).toHaveBeenCalledWith('Failed to list tickets: Error: Read error');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('move ticket', () => {
    it('should move ticket to new status', async () => {
      mockTicketManager.move.mockResolvedValue(undefined);

      await ticketCommand.parseAsync(['node', 'test', 'move', 'Feature A', '--to', 'in-progress']);

      expect(mockTicketManager.move).toHaveBeenCalledWith('Feature A', 'in-progress');
      expect(logger.success).toHaveBeenCalledWith("Moved ticket 'Feature A' to in-progress");
    });

    it('should validate status parameter', async () => {
      await ticketCommand.parseAsync(['node', 'test', 'move', 'Feature A', '--to', 'invalid-status']);

      expect(logger.error).toHaveBeenCalledWith('Invalid status: invalid-status. Must be one of: next, in-progress, done');
      expect(process.exit).toHaveBeenCalledWith(1);
      // Note: move might still be called because validation happens in the action handler
    });

    it('should handle move errors', async () => {
      mockTicketManager.move.mockRejectedValue(new Error('Ticket not found'));

      await ticketCommand.parseAsync(['node', 'test', 'move', 'Nonexistent', '--to', 'done']);

      expect(logger.error).toHaveBeenCalledWith('Failed to move ticket: Error: Ticket not found');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('delete ticket', () => {
    it('should delete a ticket', async () => {
      mockTicketManager.delete.mockResolvedValue(undefined);

      await ticketCommand.parseAsync(['node', 'test', 'delete', 'Old ticket']);

      expect(mockTicketManager.delete).toHaveBeenCalledWith('Old ticket');
      expect(logger.success).toHaveBeenCalledWith('Deleted ticket: Old ticket');
    });

    it('should handle delete errors', async () => {
      mockTicketManager.delete.mockRejectedValue(new Error('Ticket not found'));

      await ticketCommand.parseAsync(['node', 'test', 'delete', 'Nonexistent']);

      expect(logger.error).toHaveBeenCalledWith('Failed to delete ticket: Error: Ticket not found');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});