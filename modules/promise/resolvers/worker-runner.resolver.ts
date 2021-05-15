import { StrictRunnersList } from '@worker-runner/core';
import { HostRunnerResolver } from './host-runner.resolver';

/**
 * @deprecated
 * @see HostRunnerResolver
 */
export class WorkerRunnerResolver<L extends StrictRunnersList> extends HostRunnerResolver<L> {}
