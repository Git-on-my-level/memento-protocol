import { Command } from 'commander';
import { AgentFileGenerator, PlaceholderValues } from '../lib/agentFileGenerator';
import { DirectoryManager } from '../lib/directoryManager';
import { ProjectDetector } from '../lib/projectDetector';
import { ConfigManager } from '../lib/configManager';
import { logger } from '../lib/logger';
import * as path from 'path';
import inquirer from 'inquirer';
import { defaultAgents } from '../types/config';

export const addAgentCommand = new Command('add-agent')
  .description('Add agent instruction files to an existing Memento project')
  .argument('[agent]', 'Agent to add (claude, cursor, gemini)')
  .option('-f, --force', 'Force overwrite existing agent files')
  .option('-a, --all', 'Add all available agents')
  .action(async (agentName: string | undefined, options) => {
    try {
      const projectRoot = process.cwd();
      const dirManager = new DirectoryManager(projectRoot);
      const configManager = new ConfigManager(projectRoot);
      const projectDetector = new ProjectDetector(projectRoot);

      // Check if Memento is initialized
      if (!dirManager.isInitialized()) {
        logger.error('Memento Protocol is not initialized in this project.');
        logger.info('Run "memento init" first to initialize the project.');
        return;
      }

      // Determine which agents to add
      let agentsToAdd: string[] = [];
      
      if (options.all) {
        // Add all available agents
        agentsToAdd = defaultAgents.map(a => a.id);
      } else if (agentName) {
        // Validate agent name
        const validAgents = defaultAgents.map(a => a.id);
        if (!validAgents.includes(agentName)) {
          logger.error(`Invalid agent: ${agentName}`);
          logger.info(`Available agents: ${validAgents.join(', ')}`);
          return;
        }
        agentsToAdd = [agentName];
      } else {
        // Interactive selection
        const { selectedAgents } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'selectedAgents',
            message: 'Select agents to add:',
            choices: defaultAgents.map(agent => ({
              name: `${agent.name} - ${agent.description}`,
              value: agent.id,
              checked: false
            })),
            validate: (input: any) => input.length > 0 || 'Please select at least one agent'
          }
        ]);
        agentsToAdd = selectedAgents;
      }

      // Load agent metadata
      const agentMetadata = await AgentFileGenerator.loadAgentMetadata(projectRoot);
      const agentGenerator = new AgentFileGenerator(projectRoot);

      // Detect project info for placeholder values
      logger.info('Detecting project type...');
      const projectInfo = await projectDetector.detect();

      // Get current config
      const config = await configManager.load();
      
      // Prepare placeholder values
      const placeholderValues: PlaceholderValues = {
        PROJECT_NAME: path.basename(projectRoot),
        PROJECT_DESCRIPTION: `${projectInfo.type} project${projectInfo.framework ? ` using ${projectInfo.framework}` : ''}`,
        DEFAULT_MODE: config.defaultMode,
        // Add more placeholder values as needed
      };

      // Generate files for each selected agent
      logger.space();
      for (const agentId of agentsToAdd) {
        const agentConfig = agentMetadata[agentId];
        if (!agentConfig) {
          logger.warn(`No template found for agent: ${agentId}`);
          continue;
        }

        // Check if file already exists
        const exists = await agentGenerator.exists(agentConfig.targetFilename);
        if (exists && !options.force) {
          logger.warn(`${agentConfig.targetFilename} already exists. Use --force to overwrite.`);
          continue;
        }

        // Get existing content if updating
        const existingContent = exists ? await agentGenerator.readExisting(agentConfig.targetFilename) : null;

        // Generate the file
        await agentGenerator.generate(agentConfig, placeholderValues, existingContent || undefined);
      }

      // Update config with new agents
      const currentAgents = config.agents || [];
      const updatedAgents = [...new Set([...currentAgents, ...agentsToAdd])];
      if (updatedAgents.length > currentAgents.length) {
        await configManager.save({
          ...config,
          agents: updatedAgents
        });
        logger.success('Updated configuration with new agents');
      }

      logger.space();
      logger.success('Agent files generated successfully!');
      
      // Show agent-specific instructions
      if (agentsToAdd.includes('claude')) {
        logger.space();
        logger.info('Claude (CLAUDE.md):');
        logger.info('  - Use "act as [mode]" to switch behavioral patterns');
        logger.info('  - Use "execute [workflow]" to run procedures');
      }
      
      if (agentsToAdd.includes('cursor')) {
        logger.space();
        logger.info('Cursor (.cursorrules):');
        logger.info('  - Cursor will automatically follow the coding guidelines');
      }
      
      if (agentsToAdd.includes('gemini')) {
        logger.space();
        logger.info('Gemini (GEMINI.md):');
        logger.info('  - Reference this file when working with Google AI tools');
      }

    } catch (error) {
      logger.error('Failed to add agent:', error);
      process.exit(1);
    }
  });