import { Command } from 'commander';
import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { compile } from '@tastekit/core/compiler/compiler.js';
import { loadSession } from '@tastekit/core/interview/session.js';

export const compileCommand = new Command('compile')
  .description('Compile taste artifacts from onboarding session')
  .action(async () => {
    const workspacePath = join(process.cwd(), '.tastekit');
    const sessionPath = join(workspacePath, 'session.json');

    if (!existsSync(workspacePath)) {
      console.error(chalk.red('No TasteKit workspace found. Run'), chalk.bold('tastekit init'), chalk.red('first.'));
      process.exit(1);
    }

    if (!existsSync(sessionPath)) {
      console.error(chalk.red('No onboarding session found. Run'), chalk.bold('tastekit onboard'), chalk.red('first.'));
      process.exit(1);
    }

    const session = loadSession(sessionPath);
    const spinner = ora('Compiling taste artifacts...').start();

    try {
      const result = await compile({
        workspacePath,
        session,
        generatorVersion: '0.5.0',
      });

      if (result.success) {
        spinner.succeed(chalk.green('Compilation complete!'));
        console.log('\nGenerated artifacts:');
        for (const artifact of result.artifacts) {
          console.log(chalk.cyan(`  * ${artifact}`));
        }
        console.log('\nNext steps:');
        console.log(chalk.cyan('  Run'), chalk.bold('tastekit export --target claude-code'), chalk.cyan('to export for Claude Code'));
        console.log(chalk.cyan('  Run'), chalk.bold('tastekit export --target openclaw'), chalk.cyan('to export for OpenClaw'));
      } else {
        spinner.fail(chalk.red('Compilation failed'));
        result.errors?.forEach(e => console.error(chalk.red(`  ${e}`)));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('Compilation failed'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      } else {
        console.error(error);
      }
      process.exit(1);
    }
  });
