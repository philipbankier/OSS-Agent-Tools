import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { lintSkills } from '@tastekit/core/skills';
import { packSkills } from '@tastekit/core/skills';

const skillsListCommand = new Command('list')
  .description('List all skills')
  .action(async () => {
    const workspacePath = process.cwd();
    const manifestPath = join(workspacePath, '.tastekit', 'skills', 'manifest.v1.yaml');
    const skillsDir = join(workspacePath, '.tastekit', 'skills');

    console.log(chalk.bold('\nSkills Library\n'));

    if (!existsSync(manifestPath)) {
      console.log(chalk.gray('No skills manifest found.'));
      console.log(chalk.cyan('\nRun'), chalk.bold('tastekit compile'), chalk.cyan('to generate skills.'));
      return;
    }

    try {
      const YAML = await import('yaml');
      const manifest = YAML.parse(readFileSync(manifestPath, 'utf-8'));

      if (!manifest.skills || manifest.skills.length === 0) {
        console.log(chalk.gray('No skills defined.'));
        return;
      }

      for (const skill of manifest.skills) {
        const riskColor = skill.risk_level === 'high' ? chalk.red
          : skill.risk_level === 'medium' ? chalk.yellow
          : chalk.green;

        console.log(`  ${chalk.bold(skill.name)} ${chalk.gray(`(${skill.skill_id})`)}`);
        console.log(`    ${skill.description}`);
        console.log(`    Risk: ${riskColor(skill.risk_level)}  Tags: ${chalk.gray(skill.tags?.join(', ') || 'none')}`);
        console.log(`    Runtimes: ${chalk.gray(skill.compatible_runtimes?.join(', ') || 'all')}`);
        console.log('');
      }

      console.log(chalk.gray(`${manifest.skills.length} skill(s) found in ${skillsDir}`));
    } catch (err: any) {
      console.error(chalk.red(`Failed to read skills: ${err.message}`));
      process.exit(1);
    }
  });

const skillsLintCommand = new Command('lint')
  .description('Validate skills structure')
  .option('--fix', 'Show suggestions for fixing issues')
  .action(async () => {
    const workspacePath = process.cwd();
    const skillsDir = join(workspacePath, '.tastekit', 'skills');

    const spinner = ora('Linting skills...').start();

    try {
      const result = lintSkills(skillsDir);

      if (result.valid && result.warnings.length === 0) {
        spinner.succeed(chalk.green('All skills are valid.'));
        return;
      }

      if (result.valid) {
        spinner.warn(chalk.yellow(`Valid with ${result.warnings.length} warning(s)`));
      } else {
        spinner.fail(chalk.red(`${result.errors.length} error(s), ${result.warnings.length} warning(s)`));
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
    } catch (err: any) {
      spinner.fail(chalk.red(`Lint failed: ${err.message}`));
      process.exit(1);
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
    } catch (err: any) {
      spinner.fail(chalk.red(`Pack failed: ${err.message}`));
      process.exit(1);
    }
  });

export const skillsCommand = new Command('skills')
  .description('Manage skills library')
  .addCommand(skillsListCommand)
  .addCommand(skillsLintCommand)
  .addCommand(skillsPackCommand);
