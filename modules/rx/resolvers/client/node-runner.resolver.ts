import { StrictRunnersList } from '@worker-runner/core';
import { RxClientRunnerResolver } from './client-runner.resolver';

/**
 * @deprecated
 * @see RxClientRunnerResolver
 */
export class RxNodeRunnerResolver<L extends StrictRunnersList> extends RxClientRunnerResolver<L> {}
