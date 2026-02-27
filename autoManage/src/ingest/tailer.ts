import { readFileSync } from 'node:fs';

export interface TailReadResult {
  lines: string[];
  offset: number;
  rotated: boolean;
}

export class TraceTailer {
  private readonly offsets = new Map<string, number>();
  private readonly remainders = new Map<string, string>();

  readAppendedLines(filePath: string): TailReadResult {
    const data = readFileSync(filePath);

    const previousOffset = this.offsets.get(filePath) ?? 0;
    const wasRotated = data.length < previousOffset;
    const startOffset = wasRotated ? 0 : previousOffset;

    const previousRemainder = wasRotated ? '' : (this.remainders.get(filePath) ?? '');
    const textChunk = data.subarray(startOffset).toString('utf-8');
    const mergedText = previousRemainder + textChunk;

    const segments = mergedText.split('\n');
    const trailingRemainder = mergedText.endsWith('\n') ? '' : (segments.pop() ?? '');
    const lines = segments.map((segment) => segment.trim()).filter((segment) => segment.length > 0);

    this.remainders.set(filePath, trailingRemainder);
    this.offsets.set(filePath, data.length);

    return {
      lines,
      offset: data.length,
      rotated: wasRotated,
    };
  }

  reset(filePath: string): void {
    this.offsets.delete(filePath);
    this.remainders.delete(filePath);
  }
}
