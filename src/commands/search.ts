import { Command } from 'commander';
import { SourceRegistry } from '../lib/sources/SourceRegistry';
import { StarterPackManager } from '../lib/StarterPackManager';
import * as chalk from 'chalk';
import inquirer from 'inquirer';

export const searchCommand = new Command('search')
  .description('Search for packs across all sources')
  .argument('[query]', 'Search query (pack name or keywords)')
  .option('-s, --source <source>', 'Search in specific source only')
  .option('-c, --category <category>', 'Filter by category')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
  .option('-a, --author <author>', 'Filter by author')
  .option('--show-source', 'Show source for each pack')
  .option('-l, --limit <number>', 'Limit number of results', '20')
  .action(async (query, options) => {
    try {
      const projectRoot = process.cwd();
      const sourceRegistry = new SourceRegistry(projectRoot);
      const packManager = new StarterPackManager(projectRoot);
      
      await sourceRegistry.initialize();
      
      console.log(chalk.bold('\nSearching for packs...\n'));
      
      // Get all packs from all sources
      const packsBySource = await sourceRegistry.listAllPacks();
      const allPacks: Array<{ pack: string; source: string }> = [];
      
      for (const [sourceId, packs] of packsBySource) {
        for (const pack of packs) {
          // Apply basic query filter
          if (!query || pack.toLowerCase().includes(query.toLowerCase())) {
            // Apply source filter
            if (!options.source || options.source === sourceId) {
              allPacks.push({ pack, source: sourceId });
            }
          }
        }
      }
      
      // Apply additional filters if we can load pack metadata
      const filteredPacks: Array<{ pack: string; source: string; metadata?: any }> = [];
      
      for (const { pack, source } of allPacks) {
        try {
          // Try to load pack metadata for filtering
          const sourceObj = sourceRegistry.getSource(source);
          if (sourceObj) {
            const packStructure = await sourceObj.loadPack(pack);
            const manifest = packStructure.manifest;
            
            // Apply category filter
            if (options.category && manifest.category !== options.category) {
              continue;
            }
            
            // Apply tags filter
            if (options.tags) {
              const requestedTags = options.tags.split(',').map((t: string) => t.trim());
              const packTags = manifest.tags || [];
              if (!requestedTags.some((tag: string) => packTags.includes(tag))) {
                continue;
              }
            }
            
            // Apply author filter
            if (options.author && manifest.author !== options.author) {
              continue;
            }
            
            filteredPacks.push({
              pack,
              source,
              metadata: manifest,
            });
          }
        } catch (error) {
          // If we can't load metadata, just include the pack without filters
          filteredPacks.push({ pack, source });
        }
      }
      
      // Sort results
      filteredPacks.sort((a, b) => {
        // Prioritize local source
        if (a.source === 'local' && b.source !== 'local') return -1;
        if (b.source === 'local' && a.source !== 'local') return 1;
        // Then sort alphabetically
        return a.pack.localeCompare(b.pack);
      });
      
      // Apply limit
      const limit = parseInt(options.limit, 10);
      const results = filteredPacks.slice(0, limit);
      
      if (results.length === 0) {
        console.log(chalk.yellow('No packs found matching your criteria'));
        return;
      }
      
      console.log(chalk.green(`Found ${results.length} pack(s)${filteredPacks.length > limit ? ` (showing first ${limit})` : ''}:\n`));
      
      // Display results
      for (const result of results) {
        const sourceLabel = options.showSource ? chalk.gray(` [${result.source}]`) : '';
        const packName = chalk.bold(result.pack);
        
        if (result.metadata) {
          const { version, description, author, category, tags } = result.metadata;
          console.log(`${packName}${sourceLabel} v${version || '1.0.0'}`);
          console.log(chalk.gray(`  ${description || 'No description'}`));
          
          const meta = [];
          if (author) meta.push(`Author: ${author}`);
          if (category) meta.push(`Category: ${category}`);
          if (tags && tags.length) meta.push(`Tags: ${tags.join(', ')}`);
          
          if (meta.length > 0) {
            console.log(chalk.dim(`  ${meta.join(' | ')}`));
          }
        } else {
          console.log(`${packName}${sourceLabel}`);
        }
        console.log();
      }
      
      // Offer to install
      if (results.length > 0) {
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: 'Install a pack', value: 'install' },
              { name: 'Show more details', value: 'details' },
              { name: 'Exit', value: 'exit' },
            ],
          },
        ]);
        
        if (action === 'install') {
          const packChoices = results.map(r => ({
            name: `${r.pack}${options.showSource ? ` [${r.source}]` : ''}`,
            value: r.pack,
          }));
          
          const { packToInstall } = await inquirer.prompt([
            {
              type: 'list',
              name: 'packToInstall',
              message: 'Select a pack to install:',
              choices: packChoices,
            },
          ]);
          
          console.log(chalk.cyan(`\nInstalling pack '${packToInstall}'...`));
          const result = await packManager.installPack(packToInstall);
          
          if (result.success) {
            console.log(chalk.green(`\n✓ Pack '${packToInstall}' installed successfully`));
          } else {
            console.error(chalk.red(`\n✗ Failed to install pack: ${result.errors.join(', ')}`));
          }
        } else if (action === 'details') {
          const packChoices = results.map(r => ({
            name: `${r.pack}${options.showSource ? ` [${r.source}]` : ''}`,
            value: { pack: r.pack, source: r.source },
          }));
          
          const { packInfo } = await inquirer.prompt([
            {
              type: 'list',
              name: 'packInfo',
              message: 'Select a pack to see details:',
              choices: packChoices,
            },
          ]);
          
          const sourceObj = sourceRegistry.getSource(packInfo.source);
          if (sourceObj) {
            const packStructure = await sourceObj.loadPack(packInfo.pack);
            const manifest = packStructure.manifest;
            
            console.log(chalk.bold(`\nPack: ${manifest.name}`));
            console.log(`Version: ${manifest.version}`);
            console.log(`Author: ${manifest.author}`);
            console.log(`Description: ${manifest.description}`);
            
            if (manifest.category) {
              console.log(`Category: ${manifest.category}`);
            }
            
            if (manifest.tags && manifest.tags.length > 0) {
              console.log(`Tags: ${manifest.tags.join(', ')}`);
            }
            
            if (manifest.dependencies && manifest.dependencies.length > 0) {
              console.log(`Dependencies: ${manifest.dependencies.join(', ')}`);
            }
            
            console.log('\nComponents:');
            if (manifest.components.modes && manifest.components.modes.length > 0) {
              console.log(`  Modes: ${manifest.components.modes.map((m: any) => typeof m === 'string' ? m : m.name).join(', ')}`);
            }
            if (manifest.components.workflows && manifest.components.workflows.length > 0) {
              console.log(`  Workflows: ${manifest.components.workflows.map((w: any) => typeof w === 'string' ? w : w.name).join(', ')}`);
            }
            if (manifest.components.agents && manifest.components.agents.length > 0) {
              console.log(`  Agents: ${manifest.components.agents.map((a: any) => typeof a === 'string' ? a : a.name).join(', ')}`);
            }
          }
        }
      }
    } catch (error: any) {
      console.error(chalk.red(`Error searching packs: ${error.message}`));
      process.exit(1);
    }
  });