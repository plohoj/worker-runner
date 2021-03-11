import { RunnersList } from '@worker-runner/core';
import { RxHostRunnerResolver } from './host-runner.resolver';

/**
 * @deprecated
 * @see RxHostRunnerResolver
 */
export class RxWorkerRunnerResolver<L extends RunnersList> extends RxHostRunnerResolver<L> {}
