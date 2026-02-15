import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

/**
 * Filesystem utilities for TasteKit
 */

export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function writeFileSafe(path: string, content: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, content, 'utf-8');
}

export function readFileIfExists(path: string): string | null {
  if (existsSync(path)) {
    return readFileSync(path, 'utf-8');
  }
  return null;
}

export function atomicWrite(path: string, content: string): void {
  const tempPath = `${path}.tmp`;
  writeFileSync(tempPath, content, 'utf-8');
  
  // Atomic rename
  const fs = require('fs');
  fs.renameSync(tempPath, path);
}
