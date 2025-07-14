import { ticketCommand } from '../ticket';
import { DirectoryManager } from '../../lib/directoryManager';
import { TicketManager } from '../../lib/ticketManager';
import { logger } from '../../lib/logger';

jest.mock('../../lib/directoryManager');
jest.mock('../../lib/ticketManager');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('Ticket Command', () => {
  let mockDirManager: jest.Mocked<DirectoryManager>;
  let mockTicketManager: any;
  let originalExit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDirManager = {
      isInitialized: jest.fn().mockReturnValue(true)
    } as any;

    mockTicketManager = {
      createTicket: jest.fn(),
      listTickets: jest.fn(),
      continueTicket: jest.fn(),
      updateTicket: jest.fn(),
      closeTicket: jest.fn(),
      showTicket: jest.fn()
    } as any;

    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirManager);
    (TicketManager as jest.MockedClass<typeof TicketManager>).mockImplementation(() => mockTicketManager);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('create ticket', () => {
    it('should create a new ticket', async () => {
      mockTicketManager.createTicket.mockResolvedValue('feature-123');

      await ticketCommand.parseAsync(['node', 'test', 'create', 'Add new feature']);

      expect(mockTicketManager.createTicket).toHaveBeenCalledWith(
        'Add new feature',
        undefined,
        undefined
      );
      expect(logger.success).toHaveBeenCalledWith('Created ticket: feature-123');
    });

    it('should create ticket with type and assignee', async () => {
      mockTicketManager.createTicket.mockResolvedValue('bug-456');

      await ticketCommand.parseAsync([
        'node', 'test', 'create', 'Fix bug',
        '--type', 'bug',
        '--assignee', 'john'
      ]);

      expect(mockTicketManager.createTicket).toHaveBeenCalledWith(
        'Fix bug',
        'bug',
        'john'
      );
    });
  });

  describe('list tickets', () => {
    it('should list all tickets', async () => {
      const mockTickets = [
        {
          id: 'feature-123',
          title: 'Add feature',
          status: 'in_progress',
          type: 'feature',
          assignee: 'alice',
          created: new Date('2024-01-01'),
          updated: new Date('2024-01-02')
        },
        {
          id: 'bug-456',
          title: 'Fix bug',
          status: 'open',
          type: 'bug',
          created: new Date('2024-01-03'),
          updated: new Date('2024-01-03')
        }
      ];

      mockTicketManager.listTickets.mockResolvedValue(mockTickets);

      await ticketCommand.parseAsync(['node', 'test', 'list']);

      expect(logger.info).toHaveBeenCalledWith('\nActive Tickets:\n');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('feature-123'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[in_progress]'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Alice'));
    });

    it('should filter tickets by status', async () => {
      mockTicketManager.listTickets.mockResolvedValue([
        {
          id: 'feature-123',
          title: 'Closed feature',
          status: 'closed',
          created: new Date(),
          updated: new Date()
        }
      ]);

      await ticketCommand.parseAsync(['node', 'test', 'list', '--status', 'closed']);

      expect(mockTicketManager.listTickets).toHaveBeenCalledWith('closed');
    });

    it('should handle no tickets', async () => {
      mockTicketManager.listTickets.mockResolvedValue([]);

      await ticketCommand.parseAsync(['node', 'test', 'list']);

      expect(logger.info).toHaveBeenCalledWith('No tickets found.');
    });
  });

  describe('continue ticket', () => {
    it('should continue a ticket', async () => {
      const mockTicket = {
        id: 'feature-123',
        title: 'Add feature',
        status: 'in_progress',
        context: 'Working on authentication',
        created: new Date(),
        updated: new Date()
      };

      mockTicketManager.continueTicket.mockResolvedValue(mockTicket);

      await ticketCommand.parseAsync(['node', 'test', 'continue', 'feature-123']);

      expect(mockTicketManager.continueTicket).toHaveBeenCalledWith('feature-123');
      expect(logger.success).toHaveBeenCalledWith('Continuing ticket: feature-123');
      expect(logger.info).toHaveBeenCalledWith('Title: Add feature');
      expect(logger.info).toHaveBeenCalledWith('Status: in_progress');
      expect(logger.info).toHaveBeenCalledWith('\nContext:\nWorking on authentication');
    });

    it('should handle ticket not found', async () => {
      mockTicketManager.continueTicket.mockResolvedValue(null);

      await ticketCommand.parseAsync(['node', 'test', 'continue', 'nonexistent']);

      expect(logger.error).toHaveBeenCalledWith('Ticket not found: nonexistent');
    });
  });

  describe('update ticket', () => {
    it('should update ticket context', async () => {
      await ticketCommand.parseAsync([
        'node', 'test', 'update', 'feature-123',
        '--context', 'Updated progress notes'
      ]);

      expect(mockTicketManager.updateTicket).toHaveBeenCalledWith('feature-123', {
        context: 'Updated progress notes'
      });
      expect(logger.success).toHaveBeenCalledWith('Updated ticket: feature-123');
    });

    it('should update ticket status', async () => {
      await ticketCommand.parseAsync([
        'node', 'test', 'update', 'feature-123',
        '--status', 'resolved'
      ]);

      expect(mockTicketManager.updateTicket).toHaveBeenCalledWith('feature-123', {
        status: 'resolved'
      });
    });

    it('should update multiple fields', async () => {
      await ticketCommand.parseAsync([
        'node', 'test', 'update', 'feature-123',
        '--status', 'in_progress',
        '--assignee', 'bob',
        '--context', 'New context'
      ]);

      expect(mockTicketManager.updateTicket).toHaveBeenCalledWith('feature-123', {
        status: 'in_progress',
        assignee: 'bob',
        context: 'New context'
      });
    });
  });

  describe('close ticket', () => {
    it('should close a ticket', async () => {
      await ticketCommand.parseAsync(['node', 'test', 'close', 'feature-123']);

      expect(mockTicketManager.closeTicket).toHaveBeenCalledWith('feature-123');
      expect(logger.success).toHaveBeenCalledWith('Closed ticket: feature-123');
    });
  });

  describe('show ticket', () => {
    it('should show ticket details', async () => {
      const mockTicket = {
        id: 'feature-123',
        title: 'Add feature',
        status: 'open',
        type: 'feature',
        assignee: 'alice',
        context: 'Detailed context',
        created: new Date('2024-01-01'),
        updated: new Date('2024-01-02')
      };

      mockTicketManager.showTicket.mockResolvedValue(mockTicket);

      await ticketCommand.parseAsync(['node', 'test', 'show', 'feature-123']);

      expect(logger.info).toHaveBeenCalledWith('\nTicket Details:\n');
      expect(logger.info).toHaveBeenCalledWith('ID: feature-123');
      expect(logger.info).toHaveBeenCalledWith('Title: Add feature');
      expect(logger.info).toHaveBeenCalledWith('Status: open');
      expect(logger.info).toHaveBeenCalledWith('Type: feature');
      expect(logger.info).toHaveBeenCalledWith('Assignee: alice');
    });

    it('should handle ticket not found', async () => {
      mockTicketManager.showTicket.mockResolvedValue(null);

      await ticketCommand.parseAsync(['node', 'test', 'show', 'nonexistent']);

      expect(logger.error).toHaveBeenCalledWith('Ticket not found: nonexistent');
    });
  });

  describe('error handling', () => {
    it('should error when not initialized', async () => {
      mockDirManager.isInitialized.mockReturnValue(false);

      await ticketCommand.parseAsync(['node', 'test', 'list']);

      expect(logger.error).toHaveBeenCalledWith('Memento Protocol is not initialized. Run "memento init" first.');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle errors in ticket operations', async () => {
      mockTicketManager.createTicket.mockRejectedValue(new Error('Write error'));

      await ticketCommand.parseAsync(['node', 'test', 'create', 'New ticket']);

      expect(logger.error).toHaveBeenCalledWith('Failed to manage ticket: Write error');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});