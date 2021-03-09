import { RunnersList } from '@worker-runner/core';
import { ClientRunnerResolver } from './client-runner.resolver';

/**
 * @deprecated
 * @see ClientRunnerResolver
 */
export class NodeRunnerResolver<L extends RunnersList> extends ClientRunnerResolver<L> {

}
