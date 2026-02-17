import { Command } from 'commander';
import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { compile } from '@tastekit/core/compiler/compiler.js';
import { loadSession } from '@tastekit/core/interview/session.js';
import { getGlobalOptions, nextSteps, handleError, jsonOutput } from '../ui.js';

export const compileCommand = new Command('compile')
  .description('Compile taste artifacts from onboarding session')
  .action(async (_options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = join(process.cwd(), '.tastekit');
    const sessionPath = join(workspacePath, 'session.json');

    if (!existsSync(workspacePath)) {
      handleError(new Error('No TasteKit workspace found. Run `tastekit init` first.'));
    }

    if (!existsSync(sessionPath)) {
      handleError(new Error('No onboarding session found. Run `tastekit onboard` first.'));
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

        if (globals.json) {
          jsonOutput({ success: true, artifacts: result.artifacts });
        }

        console.log('\nGenerated artifacts:');
        for (const artifact of result.artifacts) {
          console.log(chalk.cyan(`  * ${artifact}`));
        }

        nextSteps([
          { cmd: 'tastekit export --target claude-code', desc: 'export for Claude Code' },
          { cmd: 'tastekit export --target openclaw', desc: 'export for OpenClaw' },
        ]);
      } else {
        spinner.fail(chalk.red('Compilation failed'));
        result.errors?.forEach(e => console.error(chalk.red(`  ${e}`)));
        process.exit(1);
      }
    } catch (error) {
      handleError(error, spinner);
    }
  });
