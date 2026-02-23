#!/usr/bin/env node

import { Command } from 'commander';
import { createCommand } from './commands/create.js';
import { verifyCommand } from './commands/verify.js';
import { exportConfigCommand } from './commands/export-config.js';

const program = new Command();

program
  .name('quickclaw')
  .description('Full-auto OpenClaw agent setup and ops provisioning')
  .version('0.1.0');

program.addCommand(createCommand());
program.addCommand(verifyCommand());
program.addCommand(exportConfigCommand());

program.parse();
