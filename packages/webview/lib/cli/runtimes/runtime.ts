import type { BuildContext, BuildResult, RuntimeInfo, RuntimeName } from '../types';

export type RuntimeProbeContext = Omit<BuildContext, 'runtime' | 'tempDir'>;

export interface RuntimeBuilder {
  readonly name: RuntimeName;
  probe(context: RuntimeProbeContext): Promise<RuntimeInfo>;
  validate(context: RuntimeProbeContext, info: RuntimeInfo): Promise<void>;
  build(context: BuildContext): Promise<BuildResult>;
  plan(context: RuntimeProbeContext, info: RuntimeInfo): string[];
}
