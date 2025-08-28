import { Command } from 'commander';
import { TicketManager, TicketStatus } from '../lib/ticketManager';
import { logger } from '../lib/logger';
import { TicketError } from '../lib/errors';

const ticketCommand = new Command('ticket')
  .description('Manage tickets for persistent workspace');

// Create subcommand
ticketCommand
  .command('create <name>')
  .description('Create a new ticket')
  .action(async (name: string) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      const ticketPath = await ticketManager.create(name);
      logger.success(`Created ticket: ${name}`);
      logger.info(`Location: ${ticketPath}`);
    } catch (error) {
      throw error;
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
      throw error;
    }
  });

// Move subcommand
ticketCommand
  .command('move <name>')
  .description('Move a ticket to a different status')
  .requiredOption('--to <status>', 'Target status (next, in-progress, done)')
  .action(async (name: string, options: { to: string }) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      
      // Validate status
      if (!['next', 'in-progress', 'done'].includes(options.to)) {
        throw new TicketError('move', name, `invalid status '${options.to}'`, 'Valid statuses are: next, in-progress, done. Example: memento ticket move <name> --to in-progress');
      }
      
      await ticketManager.move(name, options.to as TicketStatus);
      logger.success(`Moved ticket '${name}' to ${options.to}`);
    } catch (error) {
      throw error;
    }
  });

// Delete subcommand
ticketCommand
  .command('delete <name>')
  .description('Delete a ticket')
  .action(async (name: string) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      await ticketManager.delete(name);
      logger.success(`Deleted ticket: ${name}`);
    } catch (error) {
      throw error;
    }
  });

export { ticketCommand };