import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TicketManager } from '../ticketManager';

describe('TicketManager', () => {
  let tempDir: string;
  let ticketManager: TicketManager;

  beforeEach(() => {
    // Create temporary directory
    tempDir = path.join(os.tmpdir(), 'memento-test-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.memento'), { recursive: true });
    
    ticketManager = new TicketManager(tempDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('create', () => {
    it('should create a new ticket with markdown file', async () => {
      const ticketPath = await ticketManager.create('test-feature');
      
      expect(ticketPath).toBe(path.join(tempDir, '.memento', 'tickets', 'next', 'test-feature.md'));
      expect(fs.existsSync(ticketPath)).toBe(true);
      
      const content = fs.readFileSync(ticketPath, 'utf-8');
      expect(content).toContain('# test-feature');
      expect(content).toContain('## Description');
      expect(content).toContain('## Tasks');
      expect(content).toContain('## Notes');
      expect(content).toContain('Created:');
    });

    it('should throw error if ticket already exists', async () => {
      await ticketManager.create('test-feature');
      
      // Try to create again with same name
      await expect(ticketManager.create('test-feature')).rejects.toThrow("Ticket 'test-feature' already exists");
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await ticketManager.create('feature-1');
      await ticketManager.create('feature-2');
      await ticketManager.create('feature-3');
      // Move one to in-progress
      await ticketManager.move('feature-2', 'in-progress');
      // Move one to done
      await ticketManager.move('feature-3', 'done');
    });

    it('should list all tickets with their statuses', async () => {
      const tickets = await ticketManager.list();
      
      expect(tickets).toHaveLength(3);
      expect(tickets).toContainEqual({ name: 'feature-1', status: 'next' });
      expect(tickets).toContainEqual({ name: 'feature-2', status: 'in-progress' });
      expect(tickets).toContainEqual({ name: 'feature-3', status: 'done' });
    });

    it('should handle empty ticket directories', async () => {
      // Create new manager with empty directory
      const emptyManager = new TicketManager(tempDir + '-empty');
      const tickets = await emptyManager.list();
      
      expect(tickets).toHaveLength(0);
    });

    it('should ignore non-markdown files', async () => {
      // Create a non-markdown file in tickets directory
      fs.writeFileSync(
        path.join(tempDir, '.memento', 'tickets', 'next', 'not-a-ticket.txt'),
        'This should be ignored'
      );
      
      const tickets = await ticketManager.list();
      
      // Should still have only the 3 tickets we created
      expect(tickets).toHaveLength(3);
    });
  });

  describe('move', () => {
    it('should move ticket to different status', async () => {
      await ticketManager.create('test-feature');
      
      await ticketManager.move('test-feature', 'in-progress');
      
      // Check file was moved
      const oldPath = path.join(tempDir, '.memento', 'tickets', 'next', 'test-feature.md');
      const newPath = path.join(tempDir, '.memento', 'tickets', 'in-progress', 'test-feature.md');
      
      expect(fs.existsSync(oldPath)).toBe(false);
      expect(fs.existsSync(newPath)).toBe(true);
    });

    it('should throw error if ticket not found', async () => {
      await expect(ticketManager.move('nonexistent', 'done')).rejects.toThrow("Ticket 'nonexistent' not found");
    });

    it('should throw error if already in target status', async () => {
      await ticketManager.create('test-feature');
      
      await expect(ticketManager.move('test-feature', 'next')).rejects.toThrow("Ticket 'test-feature' is already in next");
    });
  });

  describe('delete', () => {
    it('should delete a ticket', async () => {
      const ticketPath = await ticketManager.create('test-feature');
      
      await ticketManager.delete('test-feature');
      
      expect(fs.existsSync(ticketPath)).toBe(false);
    });

    it('should throw error if ticket not found', async () => {
      await expect(ticketManager.delete('nonexistent')).rejects.toThrow("Ticket 'nonexistent' not found");
    });

    it('should delete ticket from any status', async () => {
      await ticketManager.create('test-feature');
      await ticketManager.move('test-feature', 'done');
      
      await ticketManager.delete('test-feature');
      
      const donePath = path.join(tempDir, '.memento', 'tickets', 'done', 'test-feature.md');
      expect(fs.existsSync(donePath)).toBe(false);
    });
  });

  describe('findTicket', () => {
    it('should find ticket with .md extension', async () => {
      await ticketManager.create('test-feature');
      
      // Use reflection to test private method
      const found = (ticketManager as any).findTicket('test-feature');
      
      expect(found).toBeTruthy();
      expect(found.status).toBe('next');
      expect(found.path).toContain('test-feature.md');
    });

    it('should find ticket without extension for backwards compatibility', async () => {
      // Create a ticket without .md extension
      const oldStylePath = path.join(tempDir, '.memento', 'tickets', 'next', 'old-ticket');
      fs.writeFileSync(oldStylePath, 'Old style ticket');
      
      const found = (ticketManager as any).findTicket('old-ticket');
      
      expect(found).toBeTruthy();
      expect(found.status).toBe('next');
      expect(found.path).toBe(oldStylePath);
    });
  });
});