import { Constructor, WorkerRunnerResolverBase } from '@core';

export class WorkerRunnerResolver<R extends Constructor<{[key: string]: any}>> extends WorkerRunnerResolverBase<R> {

}
