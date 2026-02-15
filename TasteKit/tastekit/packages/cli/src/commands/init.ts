import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import YAML from 'yaml';

export const initCommand = new Command('init')
  .description('Initialize a new TasteKit workspace')
  .argument('[path]', 'Path to initialize workspace', '.')
  .action(async (path: string) => {
    const spinner = ora('Initializing TasteKit workspace...').start();
    
    try {
      const workspacePath = join(process.cwd(), path, '.tastekit');
      
      // Check if workspace already exists
      if (existsSync(workspacePath)) {
        spinner.fail(chalk.red('TasteKit workspace already exists at this location'));
        process.exit(1);
      }
      
      // Create workspace structure
      mkdirSync(workspacePath, { recursive: true });
      mkdirSync(join(workspacePath, 'artifacts'), { recursive: true });
      mkdirSync(join(workspacePath, 'artifacts', 'playbooks'), { recursive: true });
      mkdirSync(join(workspacePath, 'artifacts', 'evalpacks'), { recursive: true });
      mkdirSync(join(workspacePath, 'skills'), { recursive: true });
      mkdirSync(join(workspacePath, 'traces'), { recursive: true });
      mkdirSync(join(workspacePath, 'compiled'), { recursive: true });
      
      // Create tastekit.yaml
      const config = {
        version: '1.0.0',
        project_name: 'my-taste-profile',
        created_at: new Date().toISOString(),
      };
      
      writeFileSync(
        join(workspacePath, 'tastekit.yaml'),
        YAML.stringify(config)
      );
      
      spinner.succeed(chalk.green('TasteKit workspace initialized successfully'));
      
      console.log('\nNext steps:');
      console.log(chalk.cyan('  1. Run'), chalk.bold('tastekit onboard'), chalk.cyan('to start the onboarding wizard'));
      console.log(chalk.cyan('  2. Run'), chalk.bold('tastekit compile'), chalk.cyan('to compile your taste artifacts'));
      console.log(chalk.cyan('  3. Run'), chalk.bold('tastekit mcp add <server>'), chalk.cyan('to add MCP tool servers'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to initialize workspace'));
      console.error(error);
      process.exit(1);
    }
  });
