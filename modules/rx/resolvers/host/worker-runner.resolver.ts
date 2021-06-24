import { StrictRunnersList } from '@worker-runner/core';
import { RxHostRunnerResolver } from './host-runner.resolver';

/**
 * @deprecated
 * @see RxHostRunnerResolver
 */
export class RxWorkerRunnerResolver<L extends StrictRunnersList> extends RxHostRunnerResolver<L> {}
