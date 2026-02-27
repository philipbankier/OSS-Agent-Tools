import { join } from 'node:path';
import { SQLiteStore } from './sqlite';

let storePromise: Promise<SQLiteStore> | null = null;

export function getDefaultStorePath(): string {
  return join(process.cwd(), '.automanage', 'automanage.db');
}

export async function getStore(): Promise<SQLiteStore> {
  if (!storePromise) {
    storePromise = SQLiteStore.create({
      dbPath: getDefaultStorePath(),
      retentionPerAgent: 1000,
    });
  }

  return await storePromise;
}

export function resetStoreForTests(): void {
  storePromise = null;
}
