import * as fs from 'fs/promises';
import { mkdirSync } from 'fs';

export async function ensureDirectory(path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true });
}

// For sync version used in tests and some commands
export function ensureDirectorySync(path: string): void {
  mkdirSync(path, { recursive: true });
}