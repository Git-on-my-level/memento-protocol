import * as fs from 'fs';
import * as path from 'path';
import { SessionRecorder } from '../sessionRecorder';
import { TicketManager } from '../ticketManager';

// Mock the file system and TicketManager
jest.mock('fs');
jest.mock('../ticketManager');

const mockedFs = fs as jest.Mocked<typeof fs>;
const MockedTicketManager = TicketManager as jest.MockedClass<typeof TicketManager>;

describe('SessionRecorder', () => {
  let sessionRecorder: SessionRecorder;
  let mockTicketManager: jest.Mocked<TicketManager>;
  const testProjectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocked TicketManager
    mockTicketManager = {
      list: jest.fn(),
    } as any;
    MockedTicketManager.mockImplementation(() => mockTicketManager);
    
    sessionRecorder = new SessionRecorder(testProjectRoot);

    // Mock fs.existsSync to return false by default
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.writeFileSync.mockReturnValue(undefined);
    mockedFs.readFileSync.mockReturnValue('');
    mockedFs.readdirSync.mockReturnValue([]);
  });

  describe('recordSession', () => {
    it('should create a new ticket when no existing ticket found', async () => {
      // Mock no tickets found
      mockTicketManager.list.mockResolvedValue([]);

      const result = await sessionRecorder.recordSession();

      expect(result).toMatch(/^session-\d+$/);
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should append to existing ticket when specified', async () => {
      const ticketName = 'existing-ticket';
      
      // Mock existing ticket
      mockTicketManager.list.mockResolvedValue([
        { name: ticketName, status: 'in-progress' }
      ]);
      
      // Mock existing ticket file
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('# Existing Ticket\n\nSome content');

      const result = await sessionRecorder.recordSession(ticketName);

      expect(result).toBe(ticketName);
      expect(mockedFs.readFileSync).toHaveBeenCalled();
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should find relevant in-progress ticket when none specified', async () => {
      const ticketName = 'auto-found-ticket';
      
      // Mock one in-progress ticket
      mockTicketManager.list.mockResolvedValue([
        { name: ticketName, status: 'in-progress' },
        { name: 'done-ticket', status: 'done' }
      ]);
      
      // Mock existing ticket file
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('# Auto Found Ticket');

      const result = await sessionRecorder.recordSession();

      expect(result).toBe(ticketName);
    });

    it('should use custom summary when provided', async () => {
      const customSummary = 'Custom session summary';
      mockTicketManager.list.mockResolvedValue([]);

      await sessionRecorder.recordSession(undefined, customSummary);

      // Verify that writeFileSync was called with content containing the custom summary
      const writeCall = mockedFs.writeFileSync.mock.calls[0];
      expect(writeCall[1]).toContain(customSummary);
    });
  });

  describe('session context capture', () => {
    it('should capture basic session context', async () => {
      mockTicketManager.list.mockResolvedValue([]);
      
      // Mock git directory exists
      mockedFs.existsSync.mockImplementation((path: any) => {
        return path.toString().endsWith('.git');
      });

      await sessionRecorder.recordSession();

      const writeCall = mockedFs.writeFileSync.mock.calls[0];
      const content = writeCall[1] as string;
      
      expect(content).toContain('Working Directory:');
      expect(content).toContain('Git Repository: Yes');
    });
  });
});