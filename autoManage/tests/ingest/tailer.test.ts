import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { TraceTailer } from '../../src/ingest/tailer';

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('TraceTailer', () => {
  it('returns appended lines without duplication', () => {
    const root = mkdtempSync(join(tmpdir(), 'automanage-tailer-'));
    dirs.push(root);

    const file = join(root, 'run.trace.v1.jsonl');
    writeFileSync(file, 'first\n');

    const tailer = new TraceTailer();
    const first = tailer.readAppendedLines(file);
    expect(first.lines).toEqual(['first']);

    appendFileSync(file, 'second\nthird\n');
    const second = tailer.readAppendedLines(file);
    expect(second.lines).toEqual(['second', 'third']);
  });

  it('resets offset when file is rotated/truncated', () => {
    const root = mkdtempSync(join(tmpdir(), 'automanage-tailer-'));
    dirs.push(root);

    const file = join(root, 'run.trace.v1.jsonl');
    writeFileSync(file, 'line-1\nline-2\n');

    const tailer = new TraceTailer();
    tailer.readAppendedLines(file);

    writeFileSync(file, 'line-3\n');
    const rotated = tailer.readAppendedLines(file);

    expect(rotated.rotated).toBe(true);
    expect(rotated.lines).toEqual(['line-3']);
  });
});
