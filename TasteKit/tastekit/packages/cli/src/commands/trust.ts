import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { TrustManager, TrustAuditor } from '@tastekit/core/trust';
import { TrustV1 } from '@tastekit/core/schemas';

const DEFAULT_TRUST_POLICY: TrustV1 = {
  schema_version: 'trust.v1',
  mcp_servers: [],
  skill_sources: [],
  update_policy: {
    allow_auto_updates: false,
    require_review: true,
  },
};

function getTrustPath(): string {
  return join(process.cwd(), '.tastekit', 'artifacts', 'trust.v1.json');
}

function loadTrustPolicy(): TrustV1 {
  const trustPath = getTrustPath();
  if (!existsSync(trustPath)) {
    return { ...DEFAULT_TRUST_POLICY };
  }
  return JSON.parse(readFileSync(trustPath, 'utf-8'));
}

function saveTrustPolicy(policy: TrustV1): void {
  const trustPath = getTrustPath();
  mkdirSync(join(trustPath, '..'), { recursive: true });
  writeFileSync(trustPath, JSON.stringify(policy, null, 2), 'utf-8');
}

const trustInitCommand = new Command('init')
  .description('Initialize trust policy')
  .action(async () => {
    const spinner = ora('Initializing trust policy...').start();
    try {
      const trustPath = getTrustPath();
      if (existsSync(trustPath)) {
        spinner.info(chalk.yellow('Trust policy already exists.'));
        return;
      }

      saveTrustPolicy(DEFAULT_TRUST_POLICY);
      spinner.succeed(chalk.green('Trust policy initialized'));
      console.log(chalk.gray(`  Written to: ${trustPath}`));
      console.log(chalk.cyan('\nUse'), chalk.bold('tastekit trust pin-mcp'), chalk.cyan('to pin MCP servers.'));
    } catch (error: any) {
      spinner.fail(chalk.red(`Failed to initialize trust policy: ${error.message}`));
      process.exit(1);
    }
  });

const trustPinMcpCommand = new Command('pin-mcp')
  .description('Pin an MCP server fingerprint')
  .argument('<server_url>', 'Server URL')
  .option('--fingerprint <hash>', 'Server fingerprint')
  .option('--mode <mode>', 'Pin mode: strict or warn', 'strict')
  .action(async (serverUrl: string, options) => {
    if (!options.fingerprint) {
      console.error(chalk.red('Please specify a fingerprint with --fingerprint'));
      console.log(chalk.cyan('Use'), chalk.bold('tastekit mcp inspect <server>'), chalk.cyan('to get the fingerprint.'));
      process.exit(1);
    }

    const spinner = ora(`Pinning MCP server: ${serverUrl}`).start();
    try {
      const policy = loadTrustPolicy();
      const manager = new TrustManager(policy);
      manager.pinMCPServer(serverUrl, options.fingerprint, options.mode);
      saveTrustPolicy(manager.getPolicy());

      spinner.succeed(chalk.green(`Pinned: ${serverUrl}`));
      console.log(chalk.gray(`  Fingerprint: ${options.fingerprint}`));
      console.log(chalk.gray(`  Mode: ${options.mode}`));
    } catch (error: any) {
      spinner.fail(chalk.red(`Failed to pin server: ${error.message}`));
      process.exit(1);
    }
  });

const trustPinSkillCommand = new Command('pin-skill-source')
  .description('Pin a skill source')
  .argument('<path>', 'Path or git URL')
  .option('--commit <hash>', 'Git commit hash (for git sources)')
  .option('--hash <hash>', 'Content hash (for local sources)')
  .option('--mode <mode>', 'Pin mode: strict or warn', 'strict')
  .action(async (pathOrUrl: string, options) => {
    const isGit = pathOrUrl.startsWith('http') || pathOrUrl.startsWith('git@');
    const hash = isGit ? options.commit : options.hash;

    if (!hash) {
      console.error(chalk.red(`Please specify a ${isGit ? '--commit' : '--hash'} for the source`));
      process.exit(1);
    }

    const spinner = ora(`Pinning skill source: ${pathOrUrl}`).start();
    try {
      const policy = loadTrustPolicy();
      const manager = new TrustManager(policy);
      manager.pinSkillSource(isGit ? 'git' : 'local', pathOrUrl, hash, options.mode);
      saveTrustPolicy(manager.getPolicy());

      spinner.succeed(chalk.green(`Pinned: ${pathOrUrl}`));
      console.log(chalk.gray(`  Type: ${isGit ? 'git' : 'local'}`));
      console.log(chalk.gray(`  ${isGit ? 'Commit' : 'Hash'}: ${hash}`));
    } catch (error: any) {
      spinner.fail(chalk.red(`Failed to pin source: ${error.message}`));
      process.exit(1);
    }
  });

const trustAuditCommand = new Command('audit')
  .description('Audit trust policy and flag violations')
  .action(async () => {
    const spinner = ora('Auditing trust policy...').start();

    try {
      const trustPath = getTrustPath();
      const bindingsPath = join(process.cwd(), '.tastekit', 'artifacts', 'bindings.v1.json');

      if (!existsSync(trustPath)) {
        spinner.info(chalk.yellow('No trust policy found. Run `tastekit trust init` first.'));
        return;
      }

      const trust = JSON.parse(readFileSync(trustPath, 'utf-8'));

      // Load bindings if they exist
      const bindings = existsSync(bindingsPath)
        ? JSON.parse(readFileSync(bindingsPath, 'utf-8'))
        : { schema_version: 'bindings.v1', servers: [] };

      const auditor = new TrustAuditor();
      const report = auditor.audit(trust, bindings);

      if (report.passed && report.violations.length === 0) {
        spinner.succeed(chalk.green('Trust audit passed. No violations.'));
      } else if (report.passed) {
        spinner.warn(chalk.yellow(`Passed with ${report.violations.length} warning(s)`));
      } else {
        spinner.fail(chalk.red(`Audit failed with ${report.violations.length} violation(s)`));
      }

      if (report.violations.length > 0) {
        console.log('');
        for (const v of report.violations) {
          const icon = v.severity === 'error' ? chalk.red('ERROR') : chalk.yellow('WARN');
          console.log(`  ${icon} [${v.type}] ${v.message}`);
        }
      }

      console.log(chalk.gray(`\n  Pinned MCP servers: ${trust.mcp_servers?.length || 0}`));
      console.log(chalk.gray(`  Pinned skill sources: ${trust.skill_sources?.length || 0}`));
      console.log(chalk.gray(`  Auto-updates: ${trust.update_policy?.allow_auto_updates ? 'enabled' : 'disabled'}`));
    } catch (error: any) {
      spinner.fail(chalk.red(`Audit failed: ${error.message}`));
      process.exit(1);
    }
  });

export const trustCommand = new Command('trust')
  .description('Manage trust and provenance')
  .addCommand(trustInitCommand)
  .addCommand(trustPinMcpCommand)
  .addCommand(trustPinSkillCommand)
  .addCommand(trustAuditCommand);
