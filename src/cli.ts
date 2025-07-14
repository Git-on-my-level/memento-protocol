import { Command } from 'commander';
import { initCommand } from './commands/init';
import { addCommand } from './commands/add';
import { listCommand } from './commands/list';
import { ticketCommand } from './commands/ticket';
import { configCommand } from './commands/config';

// Version will be injected during build
const version = '0.1.0';

const program = new Command();

program
  .name('memento')
  .description('A lightweight meta-framework for Claude Code')
  .version(version);

// Register commands
program.addCommand(initCommand);
program.addCommand(addCommand);
program.addCommand(listCommand);
program.addCommand(ticketCommand);
program.addCommand(configCommand);

// Parse command line arguments
program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}