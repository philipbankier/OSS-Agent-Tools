import { join } from 'path';
import { writeFileSafe } from '../utils/filesystem.js';
import { stringifyYAML } from '../utils/yaml.js';
import { PlaybookV1, PlaybookStep } from '../schemas/playbook.js';
import { ConstitutionV1 } from '../schemas/constitution.js';
import { SessionState } from '../schemas/workspace.js';

/**
 * Domain playbook definition — what domain playbook files export.
 */
interface DomainPlaybook {
  playbook: PlaybookV1;
}

export interface PlaybookCompilationOptions {
  workspacePath: string;
  session: SessionState;
  constitution: ConstitutionV1;
}

/**
 * Compile playbooks from domain definitions + constitution.
 *
 * Resolves domain-specific playbooks, personalizes them with
 * constitution data, and writes playbook YAML files.
 */
export async function compilePlaybooks(options: PlaybookCompilationOptions): Promise<string[]> {
  const { workspacePath, session, constitution } = options;
  const playbooksPath = join(workspacePath, 'playbooks');
  const artifacts: string[] = [];

  // Resolve domain playbooks
  const domainPlaybooks = await resolveDomainPlaybooks(session.domain_id);
  const allPlaybooks: PlaybookV1[] = [];

  for (const dp of domainPlaybooks) {
    allPlaybooks.push(dp.playbook);
  }

  // If no domain playbooks were found, generate a generic one
  if (allPlaybooks.length === 0) {
    allPlaybooks.push(generateGenericPlaybook(constitution));
  }

  // Write each playbook
  for (const playbook of allPlaybooks) {
    const filename = `${playbook.id}.v1.yaml`;
    writeFileSafe(
      join(playbooksPath, filename),
      stringifyYAML(playbook),
    );
    artifacts.push(`playbooks/${filename}`);
  }

  return artifacts;
}

/**
 * Dynamically resolve domain playbooks by domain_id.
 */
async function resolveDomainPlaybooks(domainId?: string): Promise<DomainPlaybook[]> {
  if (!domainId) return [];

  switch (domainId) {
    case 'content-agent':
      return getContentAgentPlaybooks();
    // Add more domains here as they get playbooks:
    // case 'development-agent': return getDevelopmentAgentPlaybooks();
    // case 'research-agent': return getResearchAgentPlaybooks();
    default:
      return [];
  }
}

/**
 * Content agent playbooks — pre-built workflows for content creation.
 */
function getContentAgentPlaybooks(): DomainPlaybook[] {
  return [
    {
      playbook: {
        schema_version: 'playbook.v1',
        id: 'simple-post',
        name: 'Simple Post Creation',
        description: 'Quick workflow: research optional, generate options, user picks, publish.',
        triggers: [
          { type: 'manual' },
        ],
        inputs: [
          { name: 'topic', type: 'string', required: true, description: 'Topic or subject for the post' },
          { name: 'platform', type: 'string', required: true, description: 'Target platform (twitter, linkedin, etc.)' },
          { name: 'tone_override', type: 'string', required: false, description: 'Override default voice tone' },
        ],
        steps: [
          {
            step_id: 'understand-context',
            type: 'think',
            outputs: ['context_summary'],
          },
          {
            step_id: 'generate-options',
            type: 'tool',
            tool_ref: 'skill:generate-post-options',
            params_template: {
              topic: '{{topic}}',
              platform: '{{platform}}',
              num_options: 3,
            },
            outputs: ['post_options'],
          },
          {
            step_id: 'user-selects',
            type: 'approval_gate',
            params_template: {
              message: 'Choose a post option or request modifications.',
              options: '{{post_options}}',
            },
            outputs: ['selected_post'],
          },
          {
            step_id: 'finalize',
            type: 'write',
            params_template: {
              content: '{{selected_post}}',
              format: '{{platform}}_post',
            },
            outputs: ['final_post'],
          },
        ],
        checks: [
          {
            check_id: 'voice-match',
            type: 'taste',
            condition: 'Post matches constitution voice_keywords and avoids forbidden_phrases',
          },
          {
            check_id: 'platform-fit',
            type: 'format',
            condition: 'Post fits platform character limits and format requirements',
          },
        ],
        stop_conditions: [
          {
            condition: 'User cancels or rejects all options',
            reason: 'User does not want to proceed with any variation',
          },
        ],
        escalations: [
          {
            escalation_id: 'sensitive-topic',
            trigger: 'Topic involves controversy, politics, or sensitive subjects',
            approval_ref: 'guardrails.approval_rules.content_review',
          },
        ],
      },
    },
    {
      playbook: {
        schema_version: 'playbook.v1',
        id: 'research-and-post',
        name: 'Research-Driven Post',
        description: 'Full workflow: research trends, generate ideas informed by research, create and review.',
        triggers: [
          { type: 'manual' },
        ],
        inputs: [
          { name: 'niche', type: 'string', required: true, description: 'Topic area or industry' },
          { name: 'platform', type: 'string', required: true, description: 'Target platform' },
          { name: 'timeframe', type: 'string', required: false, description: 'Trend timeframe (default: past week)' },
        ],
        steps: [
          {
            step_id: 'research-trends',
            type: 'tool',
            tool_ref: 'skill:research-trends',
            params_template: {
              niche: '{{niche}}',
              platform: '{{platform}}',
              timeframe: '{{timeframe || "past week"}}',
            },
            outputs: ['trend_data'],
          },
          {
            step_id: 'analyze-findings',
            type: 'think',
            params_template: {
              research: '{{trend_data}}',
              instruction: 'Identify the best angle based on research findings and user principles',
            },
            outputs: ['selected_angle'],
          },
          {
            step_id: 'generate-options',
            type: 'tool',
            tool_ref: 'skill:generate-post-options',
            params_template: {
              topic: '{{selected_angle}}',
              platform: '{{platform}}',
              num_options: 3,
            },
            outputs: ['post_options'],
          },
          {
            step_id: 'user-review',
            type: 'approval_gate',
            params_template: {
              message: 'Review options based on trend research. Choose or request changes.',
              options: '{{post_options}}',
              context: '{{trend_data}}',
            },
            outputs: ['selected_post'],
          },
          {
            step_id: 'finalize',
            type: 'write',
            params_template: {
              content: '{{selected_post}}',
              format: '{{platform}}_post',
            },
            outputs: ['final_post'],
          },
        ],
        checks: [
          {
            check_id: 'voice-match',
            type: 'taste',
            condition: 'Post matches constitution voice_keywords and avoids forbidden_phrases',
          },
          {
            check_id: 'trend-relevance',
            type: 'facts',
            condition: 'Post is informed by actual research findings, not generic advice',
          },
          {
            check_id: 'platform-fit',
            type: 'format',
            condition: 'Post fits platform character limits and format requirements',
          },
        ],
        stop_conditions: [
          {
            condition: 'No relevant trends found in research',
            reason: 'Research did not yield actionable insights',
          },
          {
            condition: 'User cancels',
            reason: 'User does not want to proceed',
          },
        ],
        escalations: [
          {
            escalation_id: 'sensitive-topic',
            trigger: 'Research reveals sensitive or controversial trending topics',
            approval_ref: 'guardrails.approval_rules.content_review',
          },
        ],
      },
    },
    {
      playbook: {
        schema_version: 'playbook.v1',
        id: 'content-calendar',
        name: 'Content Calendar Planning',
        description: 'Plan a week of content: research trends, map to themes, schedule posts.',
        triggers: [
          { type: 'manual' },
          { type: 'cron', schedule: '0 9 * * 1' }, // Monday at 9am
        ],
        inputs: [
          { name: 'niche', type: 'string', required: true, description: 'Topic area' },
          { name: 'platforms', type: 'string', required: true, description: 'Target platforms (comma-separated)' },
          { name: 'posts_per_week', type: 'number', required: false, description: 'Posts per week (default: 5)' },
        ],
        steps: [
          {
            step_id: 'research-trends',
            type: 'tool',
            tool_ref: 'skill:research-trends',
            params_template: {
              niche: '{{niche}}',
              platform: '{{platforms}}',
              timeframe: 'past week',
            },
            outputs: ['trend_data'],
          },
          {
            step_id: 'plan-themes',
            type: 'think',
            params_template: {
              research: '{{trend_data}}',
              instruction: 'Map trends to daily themes for {{posts_per_week || 5}} posts across {{platforms}}',
            },
            outputs: ['theme_plan'],
          },
          {
            step_id: 'review-plan',
            type: 'approval_gate',
            params_template: {
              message: 'Review the proposed content calendar. Approve or adjust.',
              plan: '{{theme_plan}}',
            },
            outputs: ['approved_plan'],
          },
          {
            step_id: 'write-calendar',
            type: 'write',
            params_template: {
              content: '{{approved_plan}}',
              format: 'content_calendar_md',
            },
            outputs: ['calendar_file'],
          },
        ],
        checks: [
          {
            check_id: 'variety',
            type: 'taste',
            condition: 'Calendar has varied topics and formats, not repetitive',
          },
          {
            check_id: 'coverage',
            type: 'format',
            condition: 'All target platforms are represented in the calendar',
          },
        ],
        stop_conditions: [
          {
            condition: 'No research data available',
            reason: 'Cannot plan without trend data',
          },
        ],
        escalations: [
          {
            escalation_id: 'high-volume',
            trigger: 'Posts per week exceeds 10',
            approval_ref: 'guardrails.approval_rules.resource_usage',
          },
        ],
      },
    },
  ];
}

/**
 * Generate a generic playbook when no domain playbooks are available.
 * Uses constitution data to personalize the workflow.
 */
function generateGenericPlaybook(constitution: ConstitutionV1): PlaybookV1 {
  const autonomyLevel = constitution.tradeoffs.autonomy_level;

  // If low autonomy, always include approval gate
  const approvalStep = autonomyLevel < 0.5;

  const steps: PlaybookStep[] = [
    {
      step_id: 'understand-task',
      type: 'think',
      outputs: ['task_analysis'],
    },
    {
      step_id: 'execute-task',
      type: 'tool',
      params_template: {
        instruction: 'Execute the task based on analysis',
      },
      outputs: ['task_result'],
    },
  ];

  if (approvalStep) {
    steps.push({
      step_id: 'review-result',
      type: 'approval_gate',
      params_template: {
        message: 'Review the result before finalizing.',
      },
      outputs: ['approved_result'],
    });
  }

  steps.push({
    step_id: 'finalize',
    type: 'write',
    params_template: {
      content: approvalStep ? '{{approved_result}}' : '{{task_result}}',
    },
    outputs: ['final_output'],
  });

  return {
    schema_version: 'playbook.v1',
    id: 'general-task',
    name: 'General Task Execution',
    description: 'Generic task workflow that follows user principles and tone preferences.',
    triggers: [{ type: 'manual' }],
    inputs: [
      { name: 'task', type: 'string', required: true, description: 'The task to perform' },
      { name: 'context', type: 'string', required: false, description: 'Additional context' },
    ],
    steps,
    checks: [
      {
        check_id: 'principles-check',
        type: 'taste',
        condition: 'Output follows user constitution principles',
      },
      {
        check_id: 'safety-check',
        type: 'safety',
        condition: 'No taboo actions taken, escalation rules respected',
      },
    ],
    stop_conditions: [
      {
        condition: 'Task cannot be completed with available tools',
        reason: 'Required capabilities not available',
      },
    ],
    escalations: [
      {
        escalation_id: 'irreversible-action',
        trigger: 'Task involves irreversible actions (delete, publish, send)',
        approval_ref: 'guardrails.approval_rules.irreversible',
      },
    ],
  };
}
