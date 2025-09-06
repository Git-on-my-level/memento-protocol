import { Command } from 'commander';
import { TicketManager, TicketStatus, TicketType, TicketCreationOptions } from '../lib/ticketManager';
import { logger } from '../lib/logger';
import inquirer from 'inquirer';
// Type guards for validation
function isValidPriority(priority: string): priority is 'low' | 'medium' | 'high' | 'critical' {
  return ['low', 'medium', 'high', 'critical'].includes(priority);
}

function isValidTicketType(type: string): type is TicketType {
  return ['feature', 'bug', 'task', 'refactor'].includes(type);
}

// Validation functions
function validatePriority(priority: string): 'low' | 'medium' | 'high' | 'critical' {
  if (!isValidPriority(priority)) {
    throw new Error(`Invalid priority: ${priority}. Must be one of: low, medium, high, critical`);
  }
  return priority;
}

function validateTicketType(type: string): TicketType {
  if (!isValidTicketType(type)) {
    throw new Error(`Invalid ticket type: ${type}. Must be one of: feature, bug, task, refactor`);
  }
  return type;
}

const ticketCommand = new Command('ticket')
  .description('Manage tickets for persistent workspace');

// Create subcommand
ticketCommand
  .command('create <name>')
  .description('Create a new ticket')
  .option('--type <type>', 'Ticket type (feature, bug, task, refactor)')
  .option('--title <title>', 'Ticket title (defaults to name)')
  .option('--description <description>', 'Ticket description')
  .option('--priority <priority>', 'Priority (low, medium, high, critical)')
  .option('--assignee <assignee>', 'Assignee name')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--interactive', 'Use interactive prompts to gather ticket information')
  .action(async (name: string, options: any) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      
      let ticketOptions: TicketCreationOptions = {};
      
      // If interactive mode is enabled or no type is specified, prompt for information
      if (options.interactive || !options.type) {
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'type',
            message: 'What type of ticket is this?',
            choices: [
              { name: '🚀 Feature - New functionality or enhancement', value: 'feature' },
              { name: '🐛 Bug - Something that needs to be fixed', value: 'bug' },
              { name: '📋 Task - General work item or chore', value: 'task' },
              { name: '♻️  Refactor - Code improvement without changing behavior', value: 'refactor' }
            ],
            default: options.type || 'task'
          },
          {
            type: 'input',
            name: 'title',
            message: 'Ticket title:',
            default: options.title || name,
            validate: (input: string) => input.trim().length > 0 || 'Title cannot be empty'
          },
          {
            type: 'input',
            name: 'description',
            message: 'Brief description (optional):',
            default: options.description || ''
          },
          {
            type: 'list',
            name: 'priority',
            message: 'Priority:',
            choices: [
              { name: '🔽 Low', value: 'low' },
              { name: '➡️  Medium', value: 'medium' },
              { name: '🔺 High', value: 'high' },
              { name: '🚨 Critical', value: 'critical' }
            ],
            default: options.priority || 'medium'
          },
          {
            type: 'input',
            name: 'assignee',
            message: 'Assignee (optional):',
            default: options.assignee || ''
          },
          {
            type: 'input',
            name: 'tags',
            message: 'Tags (comma-separated, optional):',
            default: options.tags || ''
          }
        ]);
        
        ticketOptions = {
          type: validateTicketType(answers.type),
          title: answers.title,
          description: answers.description,
          priority: validatePriority(answers.priority),
          assignee: answers.assignee,
          tags: answers.tags ? answers.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : []
        };
      } else {
        // Use command line options with validation
        ticketOptions = {
          type: options.type ? validateTicketType(options.type) : 'task',
          title: options.title,
          description: options.description,
          priority: options.priority ? validatePriority(options.priority) : 'medium',
          assignee: options.assignee,
          tags: options.tags ? options.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : []
        };
      }
      
      const ticketPath = await ticketManager.create(name, ticketOptions);
      
      logger.success(`Created ${ticketOptions.type || 'task'} ticket: ${ticketOptions.title || name}`);
      logger.info(`Location: ${ticketPath}`);
      
      if (ticketOptions.priority && ticketOptions.priority !== 'medium') {
        logger.info(`Priority: ${ticketOptions.priority}`);
      }
      if (ticketOptions.assignee) {
        logger.info(`Assignee: ${ticketOptions.assignee}`);
      }
      if (ticketOptions.tags && ticketOptions.tags.length > 0) {
        logger.info(`Tags: ${ticketOptions.tags.join(', ')}`);
      }
    } catch (error) {
      logger.error(`Failed to create ticket: ${error}`);
      process.exitCode = 1;
      return;
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
      process.exitCode = 1;
      return;
    }
  });

// Move subcommand - now accepts status as positional argument
ticketCommand
  .command('move <name> <status>')
  .description('Move a ticket to a different status (next, in-progress, done)')
  .action(async (name: string, status: string) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      
      // Validate status
      if (!['next', 'in-progress', 'done'].includes(status)) {
        logger.error(`Invalid status: ${status}. Must be one of: next, in-progress, done`);
        process.exitCode = 1;
      return;
      }
      
      await ticketManager.move(name, status as TicketStatus);
      logger.success(`Moved ticket '${name}' to ${status}`);
    } catch (error) {
      logger.error(`Failed to move ticket: ${error}`);
      process.exitCode = 1;
      return;
    }
  });

// Start subcommand - convenience for moving to in-progress
ticketCommand
  .command('start <name>')
  .description('Move a ticket to in-progress status')
  .action(async (name: string) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      await ticketManager.move(name, 'in-progress');
      logger.success(`Started ticket '${name}' (moved to in-progress)`);
    } catch (error) {
      logger.error(`Failed to start ticket: ${error}`);
      process.exitCode = 1;
      return;
    }
  });

// Finish subcommand - convenience for moving to done
ticketCommand
  .command('finish <name>')
  .description('Move a ticket to done status')
  .action(async (name: string) => {
    try {
      const ticketManager = new TicketManager(process.cwd());
      await ticketManager.move(name, 'done');
      logger.success(`Finished ticket '${name}' (moved to done)`);
    } catch (error) {
      logger.error(`Failed to finish ticket: ${error}`);
      process.exitCode = 1;
      return;
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
      logger.error(`Failed to delete ticket: ${error}`);
      process.exitCode = 1;
      return;
    }
  });

export { ticketCommand };