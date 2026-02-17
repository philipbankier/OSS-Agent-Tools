import { Command } from 'commander';
import chalk from 'chalk';

export const simulateCommand = new Command('simulate')
  .description('Run simulation with dry-run mode')
  .option('--skill <id>', 'Skill to simulate')
  .option('--playbook <id>', 'Playbook to simulate')
  .option('--no-side-effects', 'Disable side effects')
  .action(async () => {
    console.error(chalk.yellow('Simulate command not yet implemented.'));
    process.exit(1);
  });
