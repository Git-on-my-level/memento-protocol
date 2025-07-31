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
  }
}));

describe('Ticket Command Basic Coverage', () => {
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

  it('should create ticket with basic params', async () => {
    const ticketPath = '/project/.memento/tickets/next/Test ticket.md';
    mockTicketManager.create.mockResolvedValue(ticketPath);
    
    await ticketCommand.parseAsync(['node', 'test', 'create', 'Test ticket']);
    
    expect(mockTicketManager.create).toHaveBeenCalledWith('Test ticket');
    expect(logger.success).toHaveBeenCalledWith('Created ticket: Test ticket');
    expect(logger.info).toHaveBeenCalledWith(`Location: ${ticketPath}`);
  });

  it('should handle list command with empty results', async () => {
    mockTicketManager.list.mockResolvedValue([]);

    await ticketCommand.parseAsync(['node', 'test', 'list']);
    
    expect(mockTicketManager.list).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('No tickets found.');
  });

  it('should list tickets when they exist', async () => {
    mockTicketManager.list.mockResolvedValue([
      { name: 'Test ticket', status: 'next' },
      { name: 'Another ticket', status: 'in-progress' }
    ]);

    await ticketCommand.parseAsync(['node', 'test', 'list']);
    
    expect(mockTicketManager.list).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('\nnext:');
    expect(logger.info).toHaveBeenCalledWith('  - Test ticket');
    expect(logger.info).toHaveBeenCalledWith('\nin-progress:');
    expect(logger.info).toHaveBeenCalledWith('  - Another ticket');
  });

  it('should move ticket between statuses', async () => {
    mockTicketManager.move.mockResolvedValue(undefined);

    await ticketCommand.parseAsync(['node', 'test', 'move', 'Test ticket', '--to', 'done']);
    
    expect(mockTicketManager.move).toHaveBeenCalledWith('Test ticket', 'done');
    expect(logger.success).toHaveBeenCalledWith("Moved ticket 'Test ticket' to done");
  });

  it('should delete a ticket', async () => {
    mockTicketManager.delete.mockResolvedValue(undefined);

    await ticketCommand.parseAsync(['node', 'test', 'delete', 'Old ticket']);
    
    expect(mockTicketManager.delete).toHaveBeenCalledWith('Old ticket');
    expect(logger.success).toHaveBeenCalledWith('Deleted ticket: Old ticket');
  });
});