import * as fs from 'fs';
import * as path from 'path';

export type TicketStatus = 'next' | 'in-progress' | 'done';

export interface TicketInfo {
  name: string;
  status: TicketStatus;
}

export class TicketManager {
  private mementoDir: string;
  private ticketsDir: string;

  constructor(projectRoot: string) {
    this.mementoDir = path.join(projectRoot, '.memento');
    this.ticketsDir = path.join(this.mementoDir, 'tickets');
    this.ensureStatusDirectories();
  }

  /**
   * Ensure status directories exist
   */
  private ensureStatusDirectories(): void {
    const statusDirs = ['next', 'in-progress', 'done'];
    statusDirs.forEach(status => {
      const statusDir = path.join(this.ticketsDir, status);
      if (!fs.existsSync(statusDir)) {
        fs.mkdirSync(statusDir, { recursive: true });
      }
    });
  }

  /**
   * Find a ticket by name across all status directories
   */
  private findTicket(name: string): { path: string; status: TicketStatus } | null {
    const statusDirs: TicketStatus[] = ['next', 'in-progress', 'done'];
    
    for (const status of statusDirs) {
      // Check with .md extension
      const pathWithMd = path.join(this.ticketsDir, status, `${name}.md`);
      if (fs.existsSync(pathWithMd)) {
        return { path: pathWithMd, status };
      }
      
      // Check without extension (for backwards compatibility)
      const pathWithoutMd = path.join(this.ticketsDir, status, name);
      if (fs.existsSync(pathWithoutMd) && fs.statSync(pathWithoutMd).isFile()) {
        return { path: pathWithoutMd, status };
      }
    }
    
    return null;
  }

  /**
   * Create a new ticket
   */
  async create(name: string): Promise<string> {
    // Check if ticket already exists
    if (this.findTicket(name)) {
      throw new Error(`Ticket '${name}' already exists`);
    }

    const ticketPath = path.join(this.ticketsDir, 'next', `${name}.md`);
    
    // Create initial content
    const content = `# ${name}

## Description
[Add ticket description here]

## Tasks
- [ ] Task 1
- [ ] Task 2

## Notes
[Add any relevant notes here]

---
Created: ${new Date().toISOString()}
`;

    fs.writeFileSync(ticketPath, content);
    return ticketPath;
  }

  /**
   * List all tickets
   */
  async list(): Promise<TicketInfo[]> {
    const tickets: TicketInfo[] = [];
    const statusDirs: TicketStatus[] = ['next', 'in-progress', 'done'];
    
    for (const status of statusDirs) {
      const statusDir = path.join(this.ticketsDir, status);
      if (fs.existsSync(statusDir)) {
        const files = fs.readdirSync(statusDir);
        files.forEach(file => {
          // Only include .md files or files without extension that are regular files
          if (file.endsWith('.md') || (!file.includes('.') && fs.statSync(path.join(statusDir, file)).isFile())) {
            const name = file.endsWith('.md') ? file.slice(0, -3) : file;
            tickets.push({ name, status });
          }
        });
      }
    }
    
    return tickets;
  }

  /**
   * Move a ticket to a different status
   */
  async move(name: string, toStatus: TicketStatus): Promise<void> {
    const ticket = this.findTicket(name);
    if (!ticket) {
      throw new Error(`Ticket '${name}' not found`);
    }

    if (ticket.status === toStatus) {
      throw new Error(`Ticket '${name}' is already in ${toStatus}`);
    }

    const filename = path.basename(ticket.path);
    const newPath = path.join(this.ticketsDir, toStatus, filename);
    
    fs.renameSync(ticket.path, newPath);
  }

  /**
   * Delete a ticket
   */
  async delete(name: string): Promise<void> {
    const ticket = this.findTicket(name);
    if (!ticket) {
      throw new Error(`Ticket '${name}' not found`);
    }

    fs.unlinkSync(ticket.path);
  }
}