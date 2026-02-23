import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { buildDefaultConfig } from '../config/schema.js';

interface ExportConfigOptions {
  out?: string;
  format?: 'yaml' | 'json';
}

export function exportConfigCommand(): Command {
  return new Command('export-config')
    .description('Export a QuickClaw starter config')
    .option('--out <path>', 'Output path', 'quickclaw.config.yaml')
    .option('--format <yaml|json>', 'Output format', 'yaml')
    .action((options: ExportConfigOptions) => {
      const format = options.format === 'json' ? 'json' : 'yaml';
      const outPath = path.resolve(options.out ?? `quickclaw.config.${format}`);
      const config = buildDefaultConfig();

      const serialized = format === 'json' ? JSON.stringify(config, null, 2) : YAML.stringify(config);
      writeFileSync(outPath, serialized, 'utf-8');

      console.log(`Wrote ${format.toUpperCase()} config to ${outPath}`);
    });
}
