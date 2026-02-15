import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { v4 as uuidv4 } from 'uuid';

type OnboardingDepth = 'quick' | 'guided' | 'operator';

interface SessionState {
  session_id: string;
  started_at: string;
  last_updated_at: string;
  depth: OnboardingDepth;
  current_step: string;
  completed_steps: string[];
  answers: Record<string, any>;
}

export const onboardCommand = new Command('onboard')
  .description('Run the interactive onboarding wizard')
  .option('--depth <type>', 'Onboarding depth: quick, guided, or operator', 'guided')
  .option('--resume', 'Resume from previous session')
  .action(async (options) => {
    const workspacePath = join(process.cwd(), '.tastekit');
    const sessionPath = join(workspacePath, 'session.json');
    
    if (!existsSync(workspacePath)) {
      console.error(chalk.red('No TasteKit workspace found. Run'), chalk.bold('tastekit init'), chalk.red('first.'));
      process.exit(1);
    }
    
    let session: SessionState;
    
    // Load or create session
    if (options.resume && existsSync(sessionPath)) {
      const spinner = ora('Resuming previous session...').start();
      session = JSON.parse(readFileSync(sessionPath, 'utf-8'));
      spinner.succeed(chalk.green('Session loaded'));
    } else {
      session = {
        session_id: uuidv4(),
        started_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
        depth: options.depth as OnboardingDepth,
        current_step: 'welcome',
        completed_steps: [],
        answers: {},
      };
    }
    
    console.log(chalk.bold.cyan('\n🎨 TasteKit Onboarding Wizard\n'));
    console.log(chalk.gray(`Session ID: ${session.session_id}`));
    console.log(chalk.gray(`Depth: ${session.depth}\n`));
    
    // Welcome
    if (!session.completed_steps.includes('welcome')) {
      console.log(chalk.bold('Welcome to TasteKit!'));
      console.log('This wizard will help you define your taste profile.\n');
      
      const { ready } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'ready',
          message: 'Ready to begin?',
          default: true,
        },
      ]);
      
      if (!ready) {
        console.log(chalk.yellow('Onboarding cancelled. Run'), chalk.bold('tastekit onboard --resume'), chalk.yellow('to continue later.'));
        saveSession(sessionPath, session);
        process.exit(0);
      }
      
      session.completed_steps.push('welcome');
      session.current_step = 'goals';
      saveSession(sessionPath, session);
    }
    
    // Goals and principles
    if (!session.completed_steps.includes('goals')) {
      console.log(chalk.bold('\n📋 Goals and Principles\n'));
      
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'primary_goal',
          message: 'What is your primary goal for using agents?',
          validate: (input) => input.length > 0 || 'Please provide a goal',
        },
        {
          type: 'input',
          name: 'key_principles',
          message: 'What are your top 3 guiding principles? (comma-separated)',
          validate: (input) => input.length > 0 || 'Please provide at least one principle',
        },
      ]);
      
      session.answers.goals = answers;
      session.completed_steps.push('goals');
      session.current_step = 'tone';
      saveSession(sessionPath, session);
    }
    
    // Tone and voice
    if (!session.completed_steps.includes('tone')) {
      console.log(chalk.bold('\n🎤 Tone and Voice\n'));
      
      const answers = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'voice_keywords',
          message: 'Select keywords that describe your preferred communication style:',
          choices: [
            'professional',
            'casual',
            'technical',
            'friendly',
            'concise',
            'detailed',
            'formal',
            'creative',
          ],
        },
        {
          type: 'input',
          name: 'forbidden_phrases',
          message: 'Any phrases or words to avoid? (comma-separated, or leave blank)',
        },
      ]);
      
      session.answers.tone = answers;
      session.completed_steps.push('tone');
      session.current_step = 'tradeoffs';
      saveSession(sessionPath, session);
    }
    
    // Tradeoffs
    if (!session.completed_steps.includes('tradeoffs')) {
      console.log(chalk.bold('\n⚖️  Tradeoffs\n'));
      
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'accuracy_vs_speed',
          message: 'Accuracy vs Speed preference:',
          choices: [
            { name: 'Strongly prefer speed', value: 0.2 },
            { name: 'Slightly prefer speed', value: 0.4 },
            { name: 'Balanced', value: 0.5 },
            { name: 'Slightly prefer accuracy', value: 0.6 },
            { name: 'Strongly prefer accuracy', value: 0.8 },
          ],
        },
        {
          type: 'list',
          name: 'autonomy_level',
          message: 'How autonomous should agents be?',
          choices: [
            { name: 'Always ask for approval', value: 0.2 },
            { name: 'Ask for major decisions', value: 0.5 },
            { name: 'Mostly autonomous', value: 0.8 },
          ],
        },
      ]);
      
      session.answers.tradeoffs = answers;
      session.completed_steps.push('tradeoffs');
      session.current_step = 'complete';
      saveSession(sessionPath, session);
    }
    
    // Complete
    console.log(chalk.bold.green('\n✅ Onboarding Complete!\n'));
    console.log(chalk.gray('Your answers have been saved to'), chalk.bold('.tastekit/session.json'));
    console.log('\nNext steps:');
    console.log(chalk.cyan('  Run'), chalk.bold('tastekit compile'), chalk.cyan('to generate your taste artifacts'));
  });

function saveSession(path: string, session: SessionState): void {
  session.last_updated_at = new Date().toISOString();
  writeFileSync(path, JSON.stringify(session, null, 2));
}
