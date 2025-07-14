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

describe('Ticket Command Basic Coverage', () => {
  let mockDirManager: any;
  let mockTicketManager: any;
  let originalExit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDirManager = {
      isInitialized: jest.fn().mockReturnValue(true)
    };

    mockTicketManager = {
      createTicket: jest.fn().mockResolvedValue('test-123'),
      listTickets: jest.fn().mockResolvedValue([]),
      continueTicket: jest.fn(),
      updateTicket: jest.fn(),
      closeTicket: jest.fn(),
      showTicket: jest.fn()
    };

    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirManager);
    (TicketManager as jest.MockedClass<typeof TicketManager>).mockImplementation(() => mockTicketManager);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  it('should create ticket with basic params', async () => {
    await ticketCommand.parseAsync(['node', 'test', 'create', 'Test ticket']);
    
    expect(mockTicketManager.createTicket).toHaveBeenCalledWith('Test ticket', undefined, undefined);
    expect(logger.success).toHaveBeenCalledWith('Created ticket: test-123');
  });

  it('should handle show command', async () => {
    mockTicketManager.showTicket.mockResolvedValue({
      id: 'test-123',
      title: 'Test',
      status: 'open',
      created: new Date(),
      updated: new Date()
    });

    await ticketCommand.parseAsync(['node', 'test', 'show', 'test-123']);
    
    expect(logger.info).toHaveBeenCalledWith('\nTicket Details:\n');
    expect(logger.info).toHaveBeenCalledWith('ID: test-123');
  });

  it('should handle close command', async () => {
    await ticketCommand.parseAsync(['node', 'test', 'close', 'test-123']);
    
    expect(mockTicketManager.closeTicket).toHaveBeenCalledWith('test-123');
    expect(logger.success).toHaveBeenCalledWith('Closed ticket: test-123');
  });

  it('should handle update command with context', async () => {
    await ticketCommand.parseAsync(['node', 'test', 'update', 'test-123', '--context', 'New context']);
    
    expect(mockTicketManager.updateTicket).toHaveBeenCalledWith('test-123', { context: 'New context' });
    expect(logger.success).toHaveBeenCalledWith('Updated ticket: test-123');
  });

  it('should handle continue command with existing ticket', async () => {
    mockTicketManager.continueTicket.mockResolvedValue({
      id: 'test-123',
      title: 'Test',
      status: 'in_progress',
      context: 'Some context',
      created: new Date(),
      updated: new Date()
    });

    await ticketCommand.parseAsync(['node', 'test', 'continue', 'test-123']);
    
    expect(mockTicketManager.continueTicket).toHaveBeenCalledWith('test-123');
    expect(logger.success).toHaveBeenCalledWith('Continuing ticket: test-123');
    expect(logger.info).toHaveBeenCalledWith('Title: Test');
    expect(logger.info).toHaveBeenCalledWith('Status: in_progress');
    expect(logger.info).toHaveBeenCalledWith('\nContext:\nSome context');
  });
});