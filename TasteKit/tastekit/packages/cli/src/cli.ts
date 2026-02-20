#!/usr/bin/env node

/**
 * TasteKit CLI
 * 
 * Command-line interface for TasteKit taste compilation and management.
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initCommand } from './commands/init.js';
import { onboardCommand } from './commands/onboard.js';
import { compileCommand } from './commands/compile.js';
import { simulateCommand } from './commands/simulate.js';
import { mcpCommand } from './commands/mcp.js';
import { trustCommand } from './commands/trust.js';
import { skillsCommand } from './commands/skills.js';
import { driftCommand } from './commands/drift.js';
import { evalCommand } from './commands/eval.js';
import { exportCommand } from './commands/export.js';
import { importCommand } from './commands/import.js';
import { completionCommand } from './commands/completion.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('tastekit')
  .description('CLI-first taste onboarding + Skills + MCP + Drift + Trust + Tracing')
  .version(pkg.version);

// Global options
program.option('--json', 'Output in JSON format');
program.option('--verbose', 'Enable verbose logging');

// Commands
program.addCommand(initCommand);
program.addCommand(onboardCommand);
program.addCommand(compileCommand);
program.addCommand(simulateCommand);
program.addCommand(mcpCommand);
program.addCommand(trustCommand);
program.addCommand(skillsCommand);
program.addCommand(driftCommand);
program.addCommand(evalCommand);
program.addCommand(exportCommand);
program.addCommand(importCommand);
program.addCommand(completionCommand);

program.parse();
