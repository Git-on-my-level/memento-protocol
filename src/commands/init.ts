import { Command } from 'commander';
import { DirectoryManager } from '../lib/directoryManager';
import { ClaudeMdGenerator } from '../lib/claudeMdGenerator';
import { ProjectDetector } from '../lib/projectDetector';
import { logger } from '../lib/logger';

export const initCommand = new Command('init')
  .description('Initialize Memento Protocol in the current project')
  .option('-f, --force', 'Force initialization even if .memento already exists')
  .action(async (options) => {
    try {
      const projectRoot = process.cwd();
      const dirManager = new DirectoryManager(projectRoot);
      const claudeMdGenerator = new ClaudeMdGenerator(projectRoot);
      const projectDetector = new ProjectDetector(projectRoot);
      
      // Check if already initialized
      if (dirManager.isInitialized() && !options.force) {
        logger.warn('Memento Protocol is already initialized in this project.');
        logger.info('Use --force to reinitialize.');
        return;
      }

      // Initialize directory structure
      logger.info('Initializing Memento Protocol...');
      await dirManager.initializeStructure();
      
      // Update .gitignore
      await dirManager.ensureGitignore();
      
      // Detect project type
      logger.info('Detecting project type...');
      const projectInfo = await projectDetector.detect();
      logger.info(`Project type: ${projectInfo.type}${projectInfo.framework ? ` (${projectInfo.framework})` : ''}`);
      
      // Generate or update CLAUDE.md
      logger.info('Generating CLAUDE.md router...');
      const existingClaudeMd = await claudeMdGenerator.readExisting();
      await claudeMdGenerator.generate(existingClaudeMd || undefined);
      
      // Show recommendations
      const recommendations = projectDetector.getRecommendations(projectInfo);
      logger.info('\nProject Analysis:');
      recommendations.forEach(rec => logger.info(`  - ${rec}`));
      
      logger.success('\nMemento Protocol initialized successfully!');
      logger.info('\nNext steps:');
      logger.info('  1. Review the generated CLAUDE.md file');
      logger.info('  2. Install recommended components:');
      projectInfo.suggestedModes.forEach(mode => 
        logger.info(`     - memento add mode ${mode}`)
      );
      projectInfo.suggestedWorkflows.forEach(workflow => 
        logger.info(`     - memento add workflow ${workflow}`)
      );
      logger.info('  3. Run "memento list" to see all available components');
      logger.info('\nTo use with Claude Code:');
      logger.info('  - Say "act as [mode]" to switch behavioral patterns');
      logger.info('  - Say "execute [workflow]" to run procedures');
    } catch (error) {
      logger.error('Failed to initialize Memento Protocol:', error);
      process.exit(1);
    }
  });