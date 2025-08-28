import { Command } from 'commander';
import { TicketManager, TicketStatus } from '../lib/ticketManager';
import { logger } from '../lib/logger';
import { InputValidator } from '../lib/validation/InputValidator';

const ticketCommand = new Command('ticket')
  .description('Manage tickets for persistent workspace')
  .addHelpText('after', `
Examples:
  $ memento ticket create "authentication system"  # Create a new ticket
  $ memento ticket create "fix login bug"          # Create ticket for bug fix
  $ memento ticket create auth                     # Create simple ticket name
  $ memento ticket list                            # List all tickets by status
  $ memento ticket move auth --to in-progress      # Move ticket to in-progress
  $ memento ticket move auth --to done             # Mark ticket as completed
  $ memento ticket move "login bug" --to next      # Move back to next status
  $ memento ticket delete auth                     # Delete a ticket
  $ memento ticket delete "completed feature"      # Delete completed ticket

Typical workflow:
  $ memento ticket create "user registration"      # Create new ticket
  $ memento ticket move "user registration" --to in-progress  # Start work
  # Work on the feature...
  $ memento ticket move "user registration" --to done         # Mark complete

Valid statuses for --to option:
  next        - Ticket is queued for future work
  in-progress - Ticket is currently being worked on  
  done        - Ticket has been completed

Ticket organization:
  - Tickets are stored in .memento/tickets/[status]/
  - Each ticket is a markdown file for context and notes
  - Use tickets to maintain persistent context across Claude Code sessions
  - Reference ticket context in prompts: "Continue work on auth ticket"
`);

// Create subcommand
ticketCommand
  .command('create <name>')
  .description('Create a new ticket')
  .action(async (name: string) => {
    try {
      // Validate and sanitize ticket name for security
      const validatedName = InputValidator.validateTicketName(name);
      
      const ticketManager = new TicketManager(process.cwd());
      const ticketPath = await ticketManager.create(validatedName);
      logger.success(`Created ticket: ${validatedName}`);
      logger.info(`Location: ${ticketPath}`);
    } catch (error) {
      logger.error(`Failed to create ticket: ${error}`);
      process.exit(1);
    }
  });

// List subcommand
ticketCommand
  .command('list')
  .description('List all tickets')
  .action(async () => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      const tickets = await ticketManager.list();
      
      if (tickets.length === 0) {
        logger.info('No tickets found.');
        return;
      }

      const ticketsByStatus: Record<string, string[]> = {
        'next': [],
        'in-progress': [],
        'done': []
      };

      tickets.forEach(ticket => {
        if (ticketsByStatus[ticket.status]) {
          ticketsByStatus[ticket.status].push(ticket.name);
        }
      });

      Object.entries(ticketsByStatus).forEach(([status, names]) => {
        if (names.length > 0) {
          logger.info(`\n${status}:`);
          names.forEach(name => {
            logger.info(`  - ${name}`);
          });
        }
      });
    } catch (error) {
      logger.error(`Failed to list tickets: ${error}`);
      process.exit(1);
    }
  });

// Move subcommand
ticketCommand
  .command('move <name>')
  .description('Move a ticket to a different status')
  .requiredOption('--to <status>', 'Target status (next, in-progress, done)')
  .action(async (name: string, options: { to: string }) => {
    try {
      // Validate and sanitize ticket name for security
      const validatedName = InputValidator.validateTicketName(name);
      
      // Validate status
      if (!['next', 'in-progress', 'done'].includes(options.to)) {
        logger.error(`Invalid status: ${options.to}. Must be one of: next, in-progress, done`);
        process.exit(1);
      }
      
      const ticketManager = new TicketManager(process.cwd());
      await ticketManager.move(validatedName, options.to as TicketStatus);
      logger.success(`Moved ticket '${validatedName}' to ${options.to}`);
    } catch (error) {
      logger.error(`Failed to move ticket: ${error}`);
      process.exit(1);
    }
  });

// Delete subcommand
ticketCommand
  .command('delete <name>')
  .description('Delete a ticket')
  .action(async (name: string) => {
    try {
      // Validate and sanitize ticket name for security
      const validatedName = InputValidator.validateTicketName(name);
      
      const ticketManager = new TicketManager(process.cwd());
      await ticketManager.delete(validatedName);
      logger.success(`Deleted ticket: ${validatedName}`);
    } catch (error) {
      logger.error(`Failed to delete ticket: ${error}`);
      process.exit(1);
    }
  });

export { ticketCommand };