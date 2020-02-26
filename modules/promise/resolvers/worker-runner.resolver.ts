import { RunnerConstructor, WorkerRunnerResolverBase } from '@worker-runner/core';

export class WorkerRunnerResolver<R extends RunnerConstructor> extends WorkerRunnerResolverBase<R> {}
