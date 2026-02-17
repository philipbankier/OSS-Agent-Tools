import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { lintSkills } from '@tastekit/core/skills';
import { packSkills } from '@tastekit/core/skills';
import { getGlobalOptions, riskColor, header, hint, table, handleError, jsonOutput } from '../ui.js';

const skillsListCommand = new Command('list')
  .description('List all skills')
  .action(async (_options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = process.cwd();
    const manifestPath = join(workspacePath, '.tastekit', 'skills', 'manifest.v1.yaml');

    if (!existsSync(manifestPath)) {
      if (globals.json) jsonOutput({ skills: [] });
      console.log(chalk.gray('No skills manifest found.'));
      hint('tastekit compile', 'generate skills');
      return;
    }

    try {
      const YAML = await import('yaml');
      const manifest = YAML.parse(readFileSync(manifestPath, 'utf-8'));

      if (!manifest.skills || manifest.skills.length === 0) {
        if (globals.json) jsonOutput({ skills: [] });
        console.log(chalk.gray('No skills defined.'));
        return;
      }

      if (globals.json) {
        jsonOutput(manifest);
      }

      header('Skills Library');

      table(
        [
          { label: 'Name', width: 26 },
          { label: 'ID', width: 22 },
          { label: 'Risk', width: 8 },
          { label: 'Tags', width: 28 },
          { label: 'Runtimes', width: 24 },
        ],
        manifest.skills.map((skill: any) => [
          chalk.bold(skill.name),
          chalk.gray(skill.skill_id),
          riskColor(skill.risk_level),
          chalk.gray(skill.tags?.join(', ') || 'none'),
          chalk.gray(skill.compatible_runtimes?.join(', ') || 'all'),
        ]),
      );

      console.log(chalk.gray(`\n  ${manifest.skills.length} skill(s) found.`));
    } catch (error) {
      handleError(error);
    }
  });

const skillsLintCommand = new Command('lint')
  .description('Validate skills structure')
  .option('--fix', 'Show suggestions for fixing issues')
  .action(async (_options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = process.cwd();
    const skillsDir = join(workspacePath, '.tastekit', 'skills');

    const spinner = ora('Linting skills...').start();

    try {
      const result = lintSkills(skillsDir);

      if (result.valid && result.warnings.length === 0) {
        spinner.succeed(chalk.green('All skills are valid.'));
        if (globals.json) jsonOutput({ valid: true, errors: [], warnings: [] });
        return;
      }

      if (result.valid) {
        spinner.warn(chalk.yellow(`Valid with ${result.warnings.length} warning(s)`));
      } else {
        spinner.fail(chalk.red(`${result.errors.length} error(s), ${result.warnings.length} warning(s)`));
      }

      if (globals.json) {
        jsonOutput({ valid: result.valid, errors: result.errors, warnings: result.warnings });
      }

      console.log('');

      for (const error of result.errors) {
        console.log(chalk.red(`  ERROR [${error.skill_id}]: ${error.message}`));
      }

      for (const warning of result.warnings) {
        console.log(chalk.yellow(`  WARN  [${warning.skill_id}]: ${warning.message}`));
      }

      if (!result.valid) {
        process.exit(1);
      }
    } catch (error) {
      handleError(error, spinner);
    }
  });

const skillsPackCommand = new Command('pack')
  .description('Export skills as a portable pack')
  .option('--format <type>', 'Pack format: dir', 'dir')
  .option('--out <path>', 'Output path', './skills-pack')
  .action(async (options) => {
    const workspacePath = process.cwd();
    const skillsDir = join(workspacePath, '.tastekit', 'skills');

    if (!existsSync(skillsDir)) {
      console.error(chalk.red('No skills directory found. Run `tastekit compile` first.'));
      process.exit(1);
    }

    const spinner = ora('Packing skills...').start();

    try {
      const outputPath = await packSkills({
        skillsPath: skillsDir,
        outputPath: options.out,
        format: options.format,
      });

      spinner.succeed(chalk.green(`Skills packed to ${outputPath}`));
    } catch (error) {
      handleError(error, spinner);
    }
  });

export const skillsCommand = new Command('skills')
  .description('Manage skills library')
  .addCommand(skillsListCommand)
  .addCommand(skillsLintCommand)
  .addCommand(skillsPackCommand);
