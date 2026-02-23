import { describe, expect, it } from 'vitest';
import { parseClaudeOutput } from '../src/core/llm/claude-cli.js';
import { parseCodexOutput } from '../src/core/llm/codex-cli.js';

describe('llm cli parsers', () => {
  it('parses claude json output', () => {
    const out = parseClaudeOutput('{"type":"result","is_error":false,"result":"hello"}');
    expect(out).toBe('hello');
  });

  it('throws on claude error response', () => {
    expect(() => parseClaudeOutput('{"is_error":true,"result":"bad"}')).toThrow('Claude returned error');
  });

  it('parses codex jsonl output', () => {
    const stdout = [
      '{"type":"turn.started"}',
      '{"type":"result","result":"done"}',
    ].join('\n');

    const out = parseCodexOutput(stdout);
    expect(out).toBe('done');
  });

  it('throws on missing codex result line', () => {
    expect(() => parseCodexOutput('{"type":"turn.started"}')).toThrow('Unable to parse Codex');
  });
});
