import { findExecutable } from './platform';
import type { ProcessRunner } from './process';
import type { NativeTarget } from './types';

export interface NodeSigningOptions {
  /** macOS SEA binaries are ad-hoc signed unless explicitly disabled internally. */
  signMac: boolean;
}

export async function removeLegacyNodeSignature(
  executable: string,
  target: NativeTarget,
  runner: ProcessRunner,
  logger: { warn(message: string): void },
): Promise<void> {
  if (target.os === 'darwin') {
    await runner.run('codesign', ['--remove-signature', executable]);
    return;
  }
  if (target.os !== 'win32') return;

  const signtool = await findExecutable('signtool');
  if (!signtool) return;
  try {
    await runner.run(signtool, ['remove', '/s', executable]);
  } catch {
    // Removal is optional for unsigned development binaries on Windows.
    logger.warn('Could not remove an existing Windows signature; continuing with the SEA injection.');
  }
}

export async function signLegacyNodeExecutable(
  executable: string,
  target: NativeTarget,
  options: NodeSigningOptions,
  runner: ProcessRunner,
): Promise<boolean> {
  if (target.os !== 'darwin' || !options.signMac) return false;
  await runner.run('codesign', ['--sign', '-', executable]);
  return true;
}
