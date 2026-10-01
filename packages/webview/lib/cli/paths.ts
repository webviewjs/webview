import { join } from 'node:path';
import type { NativeTarget } from './types';

export function executableOutputPath(outDir: string, name: string, target: NativeTarget): string {
  const extension = target.os === 'win32' && !name.toLowerCase().endsWith('.exe') ? '.exe' : '';
  return join(outDir, `${name}${extension}`);
}
