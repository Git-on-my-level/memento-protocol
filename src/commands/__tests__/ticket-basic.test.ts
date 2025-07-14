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
      create: jest.fn().mockResolvedValue('test-123'),
      list: jest.fn().mockResolvedValue([]),
      get: jest.fn(),
      resume: jest.fn(),
      close: jest.fn(),
      search: jest.fn()
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
    
    expect(mockTicketManager.create).toHaveBeenCalledWith('Test ticket', undefined);
    expect(logger.info).toHaveBeenCalledWith('Ticket created successfully!');
    expect(logger.info).toHaveBeenCalledWith('ID: test-123');
  });

  it('should handle search command', async () => {
    mockTicketManager.search.mockResolvedValue([{
      id: 'test-123',
      name: 'Test ticket',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]);

    await ticketCommand.parseAsync(['node', 'test', 'search', 'test']);
    
    expect(mockTicketManager.search).toHaveBeenCalledWith('test');
    expect(logger.info).toHaveBeenCalledWith('\nFound 1 ticket(s) matching "test":\n');
    expect(logger.info).toHaveBeenCalledWith('🟢 test-123');
  });

  it('should handle close command', async () => {
    mockTicketManager.get.mockResolvedValue({
      id: 'test-123',
      name: 'Test',
      status: 'active'
    });

    await ticketCommand.parseAsync(['node', 'test', 'close', 'test-123']);
    
    expect(mockTicketManager.close).toHaveBeenCalledWith('test-123');
    expect(logger.success).toHaveBeenCalledWith('Closed ticket: test-123');
  });

  it('should handle list command with empty results', async () => {
    mockTicketManager.list.mockResolvedValue([]);

    await ticketCommand.parseAsync(['node', 'test', 'list']);
    
    expect(mockTicketManager.list).toHaveBeenCalledWith('active');
    expect(logger.info).toHaveBeenCalledWith('No active tickets found.');
  });

  it('should handle resume command with existing ticket', async () => {
    mockTicketManager.get.mockResolvedValue({
      id: 'test-123',
      name: 'Test',
      status: 'closed'
    });

    await ticketCommand.parseAsync(['node', 'test', 'resume', 'test-123']);
    
    expect(mockTicketManager.get).toHaveBeenCalledWith('test-123');
    expect(mockTicketManager.resume).toHaveBeenCalledWith('test-123');
    expect(logger.success).toHaveBeenCalledWith('Resumed ticket: test-123');
    expect(logger.info).toHaveBeenCalledWith('\nTicket: Test');
    expect(logger.info).toHaveBeenCalledWith('Workspace: .memento/tickets/test-123/workspace/');
  });
});