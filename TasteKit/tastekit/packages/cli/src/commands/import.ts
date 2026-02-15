import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export const importCommand = new Command('import')
  .description('Import from runtime format or SOUL.md files')
  .option('--target <adapter>', 'Source format: claude-code, manus, openclaw, autopilots, soul-md')
  .option('--source <path>', 'Source path or directory')
  .action(async (options) => {
    if (!options.target) {
      console.error(chalk.red('Please specify a source format with --target'));
      console.log(chalk.gray('Available: claude-code, manus, openclaw, autopilots, soul-md'));
      process.exit(1);
    }

    if (!options.source) {
      console.error(chalk.red('Please specify a source path with --source'));
      process.exit(1);
    }

    if (options.target === 'soul-md') {
      await importSoulMd(options.source);
      return;
    }

    console.log(chalk.yellow(`Import from ${options.target} adapter format not yet implemented.`));
    console.log(chalk.cyan('Use --target soul-md to import from OpenClaw SOUL.md/IDENTITY.md files.'));
  });

/**
 * Import from OpenClaw SOUL.md and IDENTITY.md files into TasteKit constitution.
 */
async function importSoulMd(sourcePath: string): Promise<void> {
  const spinner = ora('Importing from SOUL.md...').start();

  try {
    // Try to find SOUL.md and IDENTITY.md
    const soulPath = existsSync(join(sourcePath, 'SOUL.md'))
      ? join(sourcePath, 'SOUL.md')
      : existsSync(sourcePath) && sourcePath.endsWith('.md')
        ? sourcePath
        : null;

    if (!soulPath) {
      spinner.fail(chalk.red(`SOUL.md not found at ${sourcePath}`));
      process.exit(1);
    }

    const soulContent = readFileSync(soulPath, 'utf-8');

    // Try to read IDENTITY.md from same directory
    const identityPath = join(soulPath, '..', 'IDENTITY.md');
    const identityContent = existsSync(identityPath)
      ? readFileSync(identityPath, 'utf-8')
      : null;

    // Parse SOUL.md sections
    const sections = parseMdSections(soulContent);
    const identitySections = identityContent ? parseMdSections(identityContent) : {};

    // Build constitution from parsed content
    const constitution = buildConstitutionFromSoul(sections, identitySections);

    // Write to .tastekit/artifacts/
    const tastekitDir = join(process.cwd(), '.tastekit');
    const artifactsDir = join(tastekitDir, 'artifacts');
    mkdirSync(artifactsDir, { recursive: true });

    writeFileSync(
      join(artifactsDir, 'constitution.v1.json'),
      JSON.stringify(constitution, null, 2),
      'utf-8'
    );

    spinner.succeed(chalk.green('Imported SOUL.md into TasteKit constitution'));
    console.log(chalk.cyan('\nImported from:'));
    console.log(chalk.gray(`  SOUL.md: ${soulPath}`));
    if (identityContent) {
      console.log(chalk.gray(`  IDENTITY.md: ${identityPath}`));
    }
    console.log(chalk.cyan('\nArtifact written to:'));
    console.log(chalk.gray(`  ${join(artifactsDir, 'constitution.v1.json')}`));
    console.log(chalk.cyan('\nRun'), chalk.bold('tastekit compile'), chalk.cyan('to generate remaining artifacts.'));
  } catch (err: any) {
    spinner.fail(chalk.red(`Import failed: ${err.message}`));
    process.exit(1);
  }
}

function parseMdSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = content.split('\n');
  let currentSection = '_preamble';
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      if (currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = headingMatch[1].trim().toLowerCase();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

function buildConstitutionFromSoul(
  soul: Record<string, string>,
  identity: Record<string, string>
): any {
  // Extract principles from SOUL.md sections
  const principles: any[] = [];
  let priority = 1;

  for (const [section, content] of Object.entries(soul)) {
    if (section === '_preamble') continue;

    // Extract bullet points as principles
    const bullets = content.split('\n')
      .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
      .map(l => l.replace(/^[\s*-]+/, '').trim())
      .filter(l => l.length > 0);

    if (bullets.length > 0) {
      for (const bullet of bullets) {
        principles.push({
          id: `soul_${section.replace(/\s+/g, '_')}_${priority}`,
          statement: bullet,
          priority: priority++,
        });
      }
    } else if (content.trim().length > 0) {
      principles.push({
        id: `soul_${section.replace(/\s+/g, '_')}`,
        statement: content.trim().split('\n')[0],
        priority: priority++,
      });
    }
  }

  // Extract voice keywords from identity or soul
  const voiceKeywords: string[] = [];
  const voiceSections = ['voice', 'tone', 'personality', 'communication style'];
  for (const key of voiceSections) {
    const content = soul[key] || identity[key];
    if (content) {
      const words = content.split(/[,\n]/)
        .map(w => w.replace(/^[\s*-]+/, '').trim())
        .filter(w => w.length > 0 && w.length < 30);
      voiceKeywords.push(...words);
    }
  }

  // Extract forbidden phrases
  const forbiddenPhrases: string[] = [];
  const avoidSections = ['avoid', 'don\'t', 'never', 'restrictions', 'taboos'];
  for (const key of avoidSections) {
    const content = soul[key];
    if (content) {
      const phrases = content.split('\n')
        .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
        .map(l => l.replace(/^[\s*-]+/, '').trim())
        .filter(l => l.length > 0);
      forbiddenPhrases.push(...phrases);
    }
  }

  return {
    schema_version: 'constitution.v1',
    generator_version: '0.5.0',
    principles: principles.slice(0, 20), // Cap at 20 for readability
    tone: {
      voice_keywords: voiceKeywords.slice(0, 10),
      forbidden_phrases: forbiddenPhrases.slice(0, 10),
    },
    tradeoffs: {
      autonomy_level: 'medium',
    },
    evidence_policy: {
      require_citations_for: [],
    },
    taboos: forbiddenPhrases.slice(0, 5),
    imported_from: 'soul-md',
    imported_at: new Date().toISOString(),
  };
}
