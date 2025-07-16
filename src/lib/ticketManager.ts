import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

export interface TicketMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export type TicketStatus = 'next' | 'in-progress' | 'done';

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
   * 
   * CRITICAL SAFETY NOTE: This method ONLY creates missing directories!
   * - Never deletes existing directories or their contents
   * - The { recursive: true } option is safe - it only creates missing directories
   * - Existing tickets and their data are never touched
   * 
   * User tickets represent work history and progress. They must be preserved.
   */
  private ensureStatusDirectories(): void {
    const statusDirs = ['next', 'in-progress', 'done'];
    statusDirs.forEach(status => {
      const statusDir = path.join(this.ticketsDir, status);
      if (!fs.existsSync(statusDir)) {
        // SAFE: Only creates directory if it doesn't exist
        fs.mkdirSync(statusDir, { recursive: true });
      }
    });
  }

  /**
   * Generate a semantic ticket ID with timestamp
   */
  private generateTicketId(name: string): string {
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitizedName}-${timestamp}`;
  }

  /**
   * Get the current status of a ticket by checking which directory it's in
   */
  private async getTicketStatus(ticketId: string): Promise<TicketStatus | null> {
    const statusDirs: TicketStatus[] = ['next', 'in-progress', 'done'];
    
    for (const status of statusDirs) {
      const ticketPath = path.join(this.ticketsDir, status, ticketId);
      if (fs.existsSync(ticketPath)) {
        return status;
      }
    }
    
    return null;
  }

  /**
   * Get the full path to a ticket (searching across all status directories)
   */
  private async getTicketPath(ticketId: string): Promise<string | null> {
    const status = await this.getTicketStatus(ticketId);
    if (!status) {
      return null;
    }
    return path.join(this.ticketsDir, status, ticketId);
  }

  /**
   * Create a new ticket
   */
  async create(name: string, description?: string): Promise<string> {
    const ticketId = this.generateTicketId(name);
    const ticketPath = path.join(this.ticketsDir, 'next', ticketId);

    // Check if ticket already exists in any status directory
    const existingStatus = await this.getTicketStatus(ticketId);
    if (existingStatus) {
      throw new Error(`Ticket ${ticketId} already exists in ${existingStatus}`);
    }

    // Create ticket directory structure
    fs.mkdirSync(ticketPath, { recursive: true });
    fs.mkdirSync(path.join(ticketPath, 'workspace'), { recursive: true });

    // Create metadata
    const metadata: TicketMetadata = {
      id: ticketId,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description
    };

    // Write metadata file
    fs.writeFileSync(
      path.join(ticketPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Create initial progress file
    const progressContent = `# Ticket: ${name}

## Description
${description || 'No description provided.'}

## Progress Log
- ${new Date().toISOString()}: Ticket created

## Next Steps
- [ ] Define objectives
- [ ] Begin implementation

`;
    fs.writeFileSync(path.join(ticketPath, 'progress.md'), progressContent);

    // Create decisions file
    const decisionsContent = `# Design Decisions for ${name}

## Overview
Document key design decisions made during this ticket.

## Decisions

### ${new Date().toISOString()}
- **Decision**: Ticket created
- **Rationale**: Starting work on ${name}
- **Alternatives Considered**: N/A

`;
    fs.writeFileSync(path.join(ticketPath, 'decisions.md'), decisionsContent);

    logger.success(`Created ticket: ${ticketId}`);
    return ticketId;
  }

  /**
   * List all tickets with optional filtering
   */
  async list(status: TicketStatus | 'active' | 'closed' | 'all' = 'active'): Promise<(TicketMetadata & { status: TicketStatus })[]> {
    if (!fs.existsSync(this.ticketsDir)) {
      return [];
    }

    const tickets: (TicketMetadata & { status: TicketStatus })[] = [];
    
    // Map legacy status values to new directory structure
    let statusDirs: TicketStatus[];
    if (status === 'all') {
      statusDirs = ['next', 'in-progress', 'done'];
    } else if (status === 'active') {
      statusDirs = ['next', 'in-progress'];
    } else if (status === 'closed') {
      statusDirs = ['done'];
    } else {
      statusDirs = [status];
    }

    for (const statusDir of statusDirs) {
      const statusPath = path.join(this.ticketsDir, statusDir);
      if (!fs.existsSync(statusPath)) {
        continue;
      }

      const ticketDirs = fs.readdirSync(statusPath);

      for (const ticketDir of ticketDirs) {
        const metadataPath = path.join(statusPath, ticketDir, 'metadata.json');
        
        if (fs.existsSync(metadataPath)) {
          try {
            const metadata: TicketMetadata = JSON.parse(
              fs.readFileSync(metadataPath, 'utf-8')
            );
            
            tickets.push({
              ...metadata,
              status: statusDir
            });
          } catch (error) {
            logger.warn(`Failed to read metadata for ticket ${ticketDir}`);
          }
        }
      }
    }

    // Sort by updatedAt, newest first
    return tickets.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Get ticket details
   */
  async get(ticketId: string): Promise<(TicketMetadata & { status: TicketStatus }) | null> {
    const ticketPath = await this.getTicketPath(ticketId);
    if (!ticketPath) {
      return null;
    }

    const metadataPath = path.join(ticketPath, 'metadata.json');
    
    if (!fs.existsSync(metadataPath)) {
      return null;
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      const status = await this.getTicketStatus(ticketId);
      return {
        ...metadata,
        status: status!
      };
    } catch (error) {
      logger.error(`Failed to read ticket metadata: ${error}`);
      return null;
    }
  }

  /**
   * Update ticket metadata
   */
  async update(ticketId: string, updates: Partial<TicketMetadata>): Promise<void> {
    const ticketPath = await this.getTicketPath(ticketId);
    
    if (!ticketPath) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const metadataPath = path.join(ticketPath, 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    const updatedMetadata = {
      ...metadata,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2));

    logger.success(`Updated ticket: ${ticketId}`);
  }

  /**
   * Move ticket to a different status
   * 
   * CRITICAL SAFETY NOTE: This method MOVES tickets, never deletes them!
   * - Uses fs.renameSync to atomically move the entire ticket directory
   * - All ticket contents (workspace, files, history) are preserved
   * - If move fails, ticket remains in original location
   * 
   * NEVER use fs.rm or fs.rmdir on ticket directories. Tickets are user data
   * and must be preserved. Even "done" tickets are valuable history.
   */
  async moveToStatus(ticketId: string, newStatus: TicketStatus): Promise<void> {
    const currentStatus = await this.getTicketStatus(ticketId);
    
    if (!currentStatus) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    if (currentStatus === newStatus) {
      logger.info(`Ticket ${ticketId} is already in ${newStatus}`);
      return;
    }

    const oldPath = path.join(this.ticketsDir, currentStatus, ticketId);
    const newPath = path.join(this.ticketsDir, newStatus, ticketId);

    // SAFE: Move (not delete) the ticket directory - preserves all data
    fs.renameSync(oldPath, newPath);

    // Update the metadata
    await this.update(ticketId, {});

    // Append status change to progress file
    const progressPath = path.join(newPath, 'progress.md');
    if (fs.existsSync(progressPath)) {
      const content = fs.readFileSync(progressPath, 'utf-8');
      const statusNote = `\n- ${new Date().toISOString()}: Moved to ${newStatus}\n`;
      fs.writeFileSync(progressPath, content + statusNote);
    }

    logger.success(`Moved ticket ${ticketId} from ${currentStatus} to ${newStatus}`);
  }

  /**
   * Close a ticket (move to done)
   */
  async close(ticketId: string): Promise<void> {
    await this.moveToStatus(ticketId, 'done');
    
    // Append closure to progress file
    const ticketPath = await this.getTicketPath(ticketId);
    if (ticketPath) {
      const progressPath = path.join(ticketPath, 'progress.md');
      if (fs.existsSync(progressPath)) {
        const content = fs.readFileSync(progressPath, 'utf-8');
        const closureNote = `\n## Closure\n- ${new Date().toISOString()}: Ticket closed\n`;
        fs.writeFileSync(progressPath, content + closureNote);
      }
    }
  }

  /**
   * Resume a ticket (move to in-progress)
   */
  async resume(ticketId: string): Promise<void> {
    await this.moveToStatus(ticketId, 'in-progress');
    
    // Append resumption to progress file
    const ticketPath = await this.getTicketPath(ticketId);
    if (ticketPath) {
      const progressPath = path.join(ticketPath, 'progress.md');
      if (fs.existsSync(progressPath)) {
        const content = fs.readFileSync(progressPath, 'utf-8');
        const resumeNote = `\n- ${new Date().toISOString()}: Ticket resumed\n`;
        fs.writeFileSync(progressPath, content + resumeNote);
      }
    }
  }

  /**
   * Get the workspace directory for a ticket
   */
  getWorkspacePath(ticketId: string): string {
    // For backward compatibility, return the expected path structure
    // The actual location will be determined by searching status directories
    const statusDirs: TicketStatus[] = ['next', 'in-progress', 'done'];
    
    for (const status of statusDirs) {
      const ticketPath = path.join(this.ticketsDir, status, ticketId);
      if (fs.existsSync(ticketPath)) {
        return path.join(ticketPath, 'workspace');
      }
    }
    
    // If not found, return the expected path (for consistency with tests)
    return path.join(this.ticketsDir, ticketId, 'workspace');
  }

  /**
   * Search tickets by name or description
   */
  async search(query: string): Promise<(TicketMetadata & { status: TicketStatus })[]> {
    const allTickets = await this.list('all');
    const lowerQuery = query.toLowerCase();
    
    return allTickets.filter(ticket => 
      ticket.name.toLowerCase().includes(lowerQuery) ||
      (ticket.description && ticket.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Migrate existing tickets to the new directory structure
   */
  async migrate(): Promise<void> {
    // Check for tickets in the old flat structure
    if (!fs.existsSync(this.ticketsDir)) {
      return;
    }

    const items = fs.readdirSync(this.ticketsDir);
    let migratedCount = 0;

    for (const item of items) {
      const itemPath = path.join(this.ticketsDir, item);
      const stats = fs.statSync(itemPath);

      // Skip if it's already a status directory
      if (stats.isDirectory() && ['next', 'in-progress', 'done'].includes(item)) {
        continue;
      }

      // Check if it's a ticket directory
      const metadataPath = path.join(itemPath, 'metadata.json');
      if (stats.isDirectory() && fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          
          // Determine target directory based on old status
          let targetDir = 'next';
          if ('status' in metadata) {
            if (metadata.status === 'closed') {
              targetDir = 'done';
            } else if (metadata.status === 'active') {
              targetDir = 'in-progress';
            }
          }

          // Move to appropriate directory
          const newPath = path.join(this.ticketsDir, targetDir, item);
          fs.renameSync(itemPath, newPath);
          
          // Remove the status field from metadata
          delete metadata.status;
          fs.writeFileSync(
            path.join(newPath, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
          );

          migratedCount++;
          logger.info(`Migrated ticket ${item} to ${targetDir}`);
        } catch (error) {
          logger.error(`Failed to migrate ticket ${item}: ${error}`);
        }
      }
    }

    if (migratedCount > 0) {
      logger.success(`Migration complete: ${migratedCount} tickets migrated`);
    }
  }
}