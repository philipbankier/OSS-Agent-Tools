import chokidar, { type FSWatcher } from 'chokidar';
import { extname } from 'node:path';
import { TraceTailer } from './tailer';

export interface TraceWatcherOptions {
  onLines: (filePath: string, lines: string[]) => Promise<void> | void;
  onError?: (error: Error, filePath?: string) => void;
}

export class TraceWatcher {
  private readonly tailer = new TraceTailer();
  private watcher: FSWatcher | null = null;

  constructor(private readonly options: TraceWatcherOptions) {}

  async start(paths: string[]): Promise<void> {
    if (this.watcher || paths.length === 0) {
      return;
    }

    this.watcher = chokidar.watch(paths, {
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 50,
        pollInterval: 10,
      },
    });

    this.watcher.on('add', (filePath) => {
      void this.handleFile(filePath);
    });

    this.watcher.on('change', (filePath) => {
      void this.handleFile(filePath);
    });

    this.watcher.on('error', (error) => {
      this.options.onError?.(error instanceof Error ? error : new Error(String(error)));
    });

    await new Promise<void>((resolve) => {
      this.watcher?.once('ready', () => resolve());
    });
  }

  async close(): Promise<void> {
    if (!this.watcher) {
      return;
    }

    await this.watcher.close();
    this.watcher = null;
  }

  private async handleFile(filePath: string): Promise<void> {
    if (extname(filePath) !== '.jsonl') {
      return;
    }

    try {
      const { lines } = this.tailer.readAppendedLines(filePath);
      if (lines.length === 0) {
        return;
      }

      await this.options.onLines(filePath, lines);
    } catch (error) {
      this.options.onError?.(
        error instanceof Error ? error : new Error(String(error)),
        filePath,
      );
    }
  }
}
