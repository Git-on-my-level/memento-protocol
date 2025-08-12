import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TicketManager } from './ticketManager';

export interface SessionEntry {
  timestamp: string;
  summary: string;
  context?: string;
  sessionId?: string;
}

export class SessionRecorder {
  // Constants for limits and configuration
  private static readonly MAX_FILES = 50;
  private static readonly MAX_DEPTH = 2;
  private static readonly RECENT_FILES_LIMIT = 5;
  private static readonly KEY_FILES_LIMIT = 3;
  private static readonly ONE_HOUR_MS = 60 * 60 * 1000;

  private ticketManager: TicketManager;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.ticketManager = new TicketManager(projectRoot);
  }

  /**
   * Sanitize ticket name to prevent path traversal and other security issues
   */
  private sanitizeTicketName(name: string): string {
    // Remove dangerous path components and characters
    return name
      .replace(/\.\./g, '') // Remove path traversal attempts
      .replace(/[\\\/]/g, '') // Remove path separators
      .replace(/[<>:"|?*]/g, '') // Remove Windows invalid filename chars
      .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
      .trim()
      .substring(0, 100); // Limit length to reasonable size
  }

  /**
   * Generate a unique session ID using crypto.randomUUID
   */
  private generateSessionId(): string {
    return `session-${crypto.randomUUID()}`;
  }

  /**
   * Capture basic session context
   */
  private captureSessionContext(): string {
    const context = [];
    
    // Current working directory
    context.push(`Working Directory: ${this.projectRoot}`);
    
    // Git status if available
    try {
      const gitDir = path.join(this.projectRoot, '.git');
      if (fs.existsSync(gitDir)) {
        context.push('Git Repository: Yes');
        // Could add more git context here if needed
      }
    } catch (error) {
      // Ignore git errors
    }

    // Recent file modifications (simple approach)
    try {
      const recentFiles = this.getRecentlyModifiedFiles();
      if (recentFiles.length > 0) {
        context.push(`Recently Modified Files: ${recentFiles.slice(0, SessionRecorder.RECENT_FILES_LIMIT).join(', ')}`);
      }
    } catch (error) {
      // Ignore file system errors
    }

    return context.join('\n');
  }

  /**
   * Get recently modified files (within last hour)
   */
  private getRecentlyModifiedFiles(): string[] {
    const recentFiles: string[] = [];
    const oneHourAgo = Date.now() - SessionRecorder.ONE_HOUR_MS;

    const scanDirectory = (dir: string, depth = 0) => {
      if (depth > SessionRecorder.MAX_DEPTH) return; // Limit depth to avoid performance issues
      if (recentFiles.length >= SessionRecorder.MAX_FILES) return; // Limit total files processed

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          // Skip hidden directories and node_modules
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }

          if (entry.isFile()) {
            try {
              const stats = fs.statSync(fullPath);
              if (stats.mtime.getTime() > oneHourAgo) {
                recentFiles.push(path.relative(this.projectRoot, fullPath));
              }
            } catch (statError) {
              // Ignore individual file stat errors (handles race conditions)
              continue;
            }
          } else if (entry.isDirectory()) {
            scanDirectory(fullPath, depth + 1);
          }
        }
      } catch (error) {
        // Ignore directory scan errors
      }
    };

    scanDirectory(this.projectRoot);
    return recentFiles;
  }

  /**
   * Generate a session summary
   * Note: If session-summarizer agent is available in .claude/agents/,
   * Claude Code will automatically use it for AI-powered summaries
   */
  private generateSessionSummary(ticketName?: string): string {
    const recentFiles = this.getRecentlyModifiedFiles();
    const timestamp = new Date().toLocaleString();
    
    let summary = `Session recorded at ${timestamp}`;
    
    if (ticketName) {
      summary += ` for ticket: ${ticketName}`;
    }

    if (recentFiles.length > 0) {
      summary += `\n\nRecent activity:`;
      summary += `\n- Modified ${recentFiles.length} file(s)`;
      summary += `\n- Key files: ${recentFiles.slice(0, SessionRecorder.KEY_FILES_LIMIT).join(', ')}`;
    }


    return summary;
  }

  /**
   * Find the most relevant ticket for current session
   * Note: If ticket-finder agent is available in .claude/agents/,
   * Claude Code will automatically use it for better ticket matching
   */
  private async findRelevantTicket(): Promise<string | null> {
    const tickets = await this.ticketManager.list();
    
    // Simple heuristic: find tickets in 'in-progress' status first
    const inProgressTickets = tickets.filter(t => t.status === 'in-progress');
    if (inProgressTickets.length === 1) {
      return inProgressTickets[0].name;
    }

    // If multiple or no in-progress tickets, return null to create new one
    return null;
  }

  /**
   * Record current session to a ticket
   */
  async recordSession(ticketName?: string, summary?: string): Promise<string> {
    let targetTicket = ticketName;
    
    // Sanitize ticket name if provided
    if (targetTicket) {
      targetTicket = this.sanitizeTicketName(targetTicket);
      if (!targetTicket) {
        throw new Error('Invalid ticket name after sanitization');
      }
    }
    
    // If no ticket specified, try to find relevant one
    if (!targetTicket) {
      targetTicket = await this.findRelevantTicket() || undefined;
    }

    // Generate session summary
    const sessionSummary = summary || this.generateSessionSummary(targetTicket);
    const sessionContext = this.captureSessionContext();
    const sessionId = this.generateSessionId();

    const sessionEntry: SessionEntry = {
      timestamp: new Date().toISOString(),
      summary: sessionSummary,
      context: sessionContext,
      sessionId
    };

    // If we have a target ticket, append to it
    if (targetTicket) {
      await this.appendToTicket(targetTicket, sessionEntry);
      return targetTicket;
    } else {
      // Create new ticket with readable name
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const shortId = crypto.randomBytes(3).toString('hex'); // 6 char hex
      const newTicketName = this.sanitizeTicketName(`session-${timestamp}-${shortId}`);
      await this.createTicketWithSession(newTicketName, sessionEntry);
      return newTicketName;
    }
  }

  /**
   * Append session entry to existing ticket
   */
  private async appendToTicket(ticketName: string, sessionEntry: SessionEntry): Promise<void> {
    const sanitizedName = this.sanitizeTicketName(ticketName);
    const tickets = await this.ticketManager.list();
    const ticket = tickets.find(t => t.name === sanitizedName);
    
    if (!ticket) {
      throw new Error(`Ticket '${sanitizedName}' not found`);
    }

    // Read current ticket content
    const ticketPath = path.join(this.projectRoot, '.memento', 'tickets', ticket.status, `${sanitizedName}.md`);
    let content = '';
    
    if (fs.existsSync(ticketPath)) {
      content = fs.readFileSync(ticketPath, 'utf8');
    }

    // Append session entry
    const sessionSection = `

---

## Session Entry - ${new Date(sessionEntry.timestamp).toLocaleString()}
**Session ID:** ${sessionEntry.sessionId}

### Summary
${sessionEntry.summary}

### Context
\`\`\`
${sessionEntry.context}
\`\`\`
`;

    content += sessionSection;
    fs.writeFileSync(ticketPath, content);
  }

  /**
   * Create new ticket with session entry
   */
  private async createTicketWithSession(ticketName: string, sessionEntry: SessionEntry): Promise<void> {
    const sanitizedName = this.sanitizeTicketName(ticketName);
    // Create basic ticket structure with session
    const content = `# ${sanitizedName}

## Description
Session-based ticket created automatically.

## Tasks
- [ ] Review session context
- [ ] Define specific tasks

## Session Entry - ${new Date(sessionEntry.timestamp).toLocaleString()}
**Session ID:** ${sessionEntry.sessionId}

### Summary
${sessionEntry.summary}

### Context
\`\`\`
${sessionEntry.context}
\`\`\`

---
Created: ${sessionEntry.timestamp}
`;

    const ticketPath = path.join(this.projectRoot, '.memento', 'tickets', 'next', `${sanitizedName}.md`);
    
    // Ensure directory exists
    const ticketDir = path.dirname(ticketPath);
    if (!fs.existsSync(ticketDir)) {
      fs.mkdirSync(ticketDir, { recursive: true });
    }
    
    fs.writeFileSync(ticketPath, content);
  }
}