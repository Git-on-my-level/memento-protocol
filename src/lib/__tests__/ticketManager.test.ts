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
    it('should create a new ticket with proper structure', async () => {
      const ticketId = await ticketManager.create('test-feature', 'Test description');
      
      expect(ticketId).toMatch(/^test-feature-\d{4}-\d{2}-\d{2}$/);
      
      const ticketPath = path.join(tempDir, '.memento', 'tickets', 'next', ticketId);
      expect(fs.existsSync(ticketPath)).toBe(true);
      expect(fs.existsSync(path.join(ticketPath, 'metadata.json'))).toBe(true);
      expect(fs.existsSync(path.join(ticketPath, 'progress.md'))).toBe(true);
      expect(fs.existsSync(path.join(ticketPath, 'decisions.md'))).toBe(true);
      expect(fs.existsSync(path.join(ticketPath, 'workspace'))).toBe(true);
    });

    it('should store correct metadata', async () => {
      const ticketId = await ticketManager.create('test-feature', 'Test description');
      const metadata = await ticketManager.get(ticketId);
      
      expect(metadata).toBeTruthy();
      expect(metadata!.name).toBe('test-feature');
      expect(metadata!.description).toBe('Test description');
      expect(metadata!.status).toBe('next');
      expect(metadata!.id).toBe(ticketId);
    });

    it('should throw error if ticket already exists', async () => {
      await ticketManager.create('test-feature');
      
      // Try to create again with same name on same date
      await expect(ticketManager.create('test-feature')).rejects.toThrow();
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await ticketManager.create('feature-1', 'First feature');
      await ticketManager.create('feature-2', 'Second feature');
      const ticket3Id = await ticketManager.create('feature-3', 'Third feature');
      await ticketManager.close(ticket3Id);
    });

    it('should list active tickets by default', async () => {
      const tickets = await ticketManager.list();
      
      expect(tickets).toHaveLength(2);
      expect(tickets.every(t => t.status === 'next' || t.status === 'in-progress')).toBe(true);
    });

    it('should list all tickets when requested', async () => {
      const tickets = await ticketManager.list('all');
      
      expect(tickets).toHaveLength(3);
      expect(tickets.filter(t => t.status === 'next' || t.status === 'in-progress')).toHaveLength(2);
      expect(tickets.filter(t => t.status === 'done')).toHaveLength(1);
    });

    it('should list only closed tickets when requested', async () => {
      const tickets = await ticketManager.list('closed');
      
      expect(tickets).toHaveLength(1);
      expect(tickets[0].status).toBe('done');
    });

    it('should sort tickets by updatedAt descending', async () => {
      const tickets = await ticketManager.list('all');
      
      for (let i = 1; i < tickets.length; i++) {
        const prev = new Date(tickets[i - 1].updatedAt).getTime();
        const curr = new Date(tickets[i].updatedAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe('update', () => {
    it('should update ticket metadata', async () => {
      const ticketId = await ticketManager.create('test-feature');
      const originalMetadata = await ticketManager.get(ticketId);
      
      // Add a small delay to ensure updatedAt differs
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await ticketManager.update(ticketId, {
        description: 'Updated description'
      });
      
      const metadata = await ticketManager.get(ticketId);
      expect(metadata!.description).toBe('Updated description');
      expect(metadata!.updatedAt).not.toBe(originalMetadata!.createdAt);
    });

    it('should throw error if ticket not found', async () => {
      await expect(ticketManager.update('non-existent', {})).rejects.toThrow();
    });
  });

  describe('close and resume', () => {
    it('should close a ticket', async () => {
      const ticketId = await ticketManager.create('test-feature');
      await ticketManager.close(ticketId);
      
      const metadata = await ticketManager.get(ticketId);
      expect(metadata!.status).toBe('done');
      
      // Check progress file was updated
      const progressPath = path.join(tempDir, '.memento', 'tickets', 'done', ticketId, 'progress.md');
      const progress = fs.readFileSync(progressPath, 'utf-8');
      expect(progress).toContain('Ticket closed');
    });

    it('should resume a ticket', async () => {
      const ticketId = await ticketManager.create('test-feature');
      await ticketManager.close(ticketId);
      await ticketManager.resume(ticketId);
      
      const metadata = await ticketManager.get(ticketId);
      expect(metadata!.status).toBe('in-progress');
      
      // Check progress file was updated
      const progressPath = path.join(tempDir, '.memento', 'tickets', 'in-progress', ticketId, 'progress.md');
      const progress = fs.readFileSync(progressPath, 'utf-8');
      expect(progress).toContain('Ticket resumed');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await ticketManager.create('auth-feature', 'Authentication implementation');
      await ticketManager.create('payment-flow', 'Payment processing');
      await ticketManager.create('user-profile', 'User profile management');
    });

    it('should search by name', async () => {
      const results = await ticketManager.search('auth');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('auth-feature');
    });

    it('should search by description', async () => {
      const results = await ticketManager.search('payment');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('payment-flow');
    });

    it('should be case insensitive', async () => {
      const results = await ticketManager.search('AUTH');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('auth-feature');
    });

    it('should return empty array if no matches', async () => {
      const results = await ticketManager.search('nonexistent');
      
      expect(results).toHaveLength(0);
    });
  });

  describe('getWorkspacePath', () => {
    it('should return correct workspace path', async () => {
      const ticketId = await ticketManager.create('test-feature');
      const workspacePath = ticketManager.getWorkspacePath(ticketId);
      
      expect(workspacePath).toBe(
        path.join(tempDir, '.memento', 'tickets', 'next', ticketId, 'workspace')
      );
    });
  });

  describe('migrate', () => {
    it('should migrate tickets from old structure to new directory structure', async () => {
      // Create tickets in old structure manually
      const ticketsDir = path.join(tempDir, '.memento', 'tickets');
      
      // Create active ticket in old structure
      const activeTicketId = 'old-active-2025-01-13';
      const activeTicketPath = path.join(ticketsDir, activeTicketId);
      fs.mkdirSync(activeTicketPath, { recursive: true });
      fs.writeFileSync(
        path.join(activeTicketPath, 'metadata.json'),
        JSON.stringify({
          id: activeTicketId,
          name: 'old-active',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, null, 2)
      );
      
      // Create closed ticket in old structure
      const closedTicketId = 'old-closed-2025-01-13';
      const closedTicketPath = path.join(ticketsDir, closedTicketId);
      fs.mkdirSync(closedTicketPath, { recursive: true });
      fs.writeFileSync(
        path.join(closedTicketPath, 'metadata.json'),
        JSON.stringify({
          id: closedTicketId,
          name: 'old-closed',
          status: 'closed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, null, 2)
      );
      
      // Run migration
      await ticketManager.migrate();
      
      // Verify tickets are in new locations
      expect(fs.existsSync(path.join(ticketsDir, 'in-progress', activeTicketId))).toBe(true);
      expect(fs.existsSync(path.join(ticketsDir, 'done', closedTicketId))).toBe(true);
      
      // Verify old locations are gone
      expect(fs.existsSync(activeTicketPath)).toBe(false);
      expect(fs.existsSync(closedTicketPath)).toBe(false);
      
      // Verify metadata no longer has status field
      const migratedActive = await ticketManager.get(activeTicketId);
      const migratedClosed = await ticketManager.get(closedTicketId);
      
      expect(migratedActive!.status).toBe('in-progress');
      expect(migratedClosed!.status).toBe('done');
    });
  });

  describe('moveToStatus', () => {
    it('should move ticket between status directories', async () => {
      const ticketId = await ticketManager.create('test-feature');
      
      // Move from next to in-progress
      await ticketManager.moveToStatus(ticketId, 'in-progress');
      expect(fs.existsSync(path.join(tempDir, '.memento', 'tickets', 'in-progress', ticketId))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.memento', 'tickets', 'next', ticketId))).toBe(false);
      
      const inProgressTicket = await ticketManager.get(ticketId);
      expect(inProgressTicket!.status).toBe('in-progress');
      
      // Move from in-progress to done
      await ticketManager.moveToStatus(ticketId, 'done');
      expect(fs.existsSync(path.join(tempDir, '.memento', 'tickets', 'done', ticketId))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.memento', 'tickets', 'in-progress', ticketId))).toBe(false);
      
      const doneTicket = await ticketManager.get(ticketId);
      expect(doneTicket!.status).toBe('done');
    });
    
    it('should handle moving to same status gracefully', async () => {
      const ticketId = await ticketManager.create('test-feature');
      
      // Move to same status
      await ticketManager.moveToStatus(ticketId, 'next');
      
      const ticket = await ticketManager.get(ticketId);
      expect(ticket!.status).toBe('next');
    });
  });
});