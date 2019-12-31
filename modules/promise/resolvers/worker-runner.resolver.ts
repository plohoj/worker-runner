import { Constructor, WorkerRunnerResolverBase } from '@worker-runner/core';

export class WorkerRunnerResolver<R extends Constructor<{[key: string]: any}>> extends WorkerRunnerResolverBase<R> {

}
