import { Command } from 'commander';
import chalk from 'chalk';

export const importCommand = new Command('import')
  .description('Import from runtime adapter format')
  .option('--target <adapter>', 'Source adapter: claude-code, manus, openclaw, autopilots')
  .option('--source <path>', 'Source path')
  .action(async (options) => {
    if (!options.target) {
      console.error(chalk.red('Please specify a source adapter with --target'));
      process.exit(1);
    }
    
    console.log(chalk.yellow(`Import from ${options.target} not yet implemented`));
    // TODO: Implement import
  });
