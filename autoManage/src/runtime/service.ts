import { getStore } from '../storage';
import { IngestionService } from '../ingest/service';

const GLOBAL_KEY = '__automanage_ingestion_service__';

type IngestionGlobal = typeof globalThis & {
  [GLOBAL_KEY]?: Promise<IngestionService>;
};

function getTraceDirsFromEnv(): string[] {
  const raw = process.env.AUTOMANAGE_TRACE_DIRS;
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export async function getIngestionService(): Promise<IngestionService> {
  const globalRef = globalThis as IngestionGlobal;

  if (!globalRef[GLOBAL_KEY]) {
    globalRef[GLOBAL_KEY] = (async () => {
      const store = await getStore();
      const service = new IngestionService({
        store,
        stalenessMs: 60_000,
      });

      const traceDirs = getTraceDirsFromEnv();
      if (traceDirs.length > 0) {
        await service.startWatchingDirectories(traceDirs);
      }

      return service;
    })();
  }

  return await globalRef[GLOBAL_KEY];
}
