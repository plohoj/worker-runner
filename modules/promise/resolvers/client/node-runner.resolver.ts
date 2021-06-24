import { StrictRunnersList } from '@worker-runner/core';
import { ClientRunnerResolver } from './client-runner.resolver';

/**
 * @deprecated
 * @see ClientRunnerResolver
 */
export class NodeRunnerResolver<L extends StrictRunnersList> extends ClientRunnerResolver<L> {}
