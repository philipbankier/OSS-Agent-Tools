#!/usr/bin/env node

/**
 * TasteKit CLI
 * 
 * Command-line interface for TasteKit taste compilation and management.
 */

import { Command } from 'commander';
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

const program = new Command();

program
  .name('tastekit')
  .description('CLI-first taste onboarding + Skills + MCP + Drift + Trust + Tracing')
  .version('1.0.0');

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

program.parse();
