import { RunnersList } from '@worker-runner/core';
import { HostRunnerResolver } from './host-runner.resolver';

/**
 * @deprecated
 * @see HostRunnerResolver
 */
export class WorkerRunnerResolver<L extends RunnersList> extends HostRunnerResolver<L> {}
