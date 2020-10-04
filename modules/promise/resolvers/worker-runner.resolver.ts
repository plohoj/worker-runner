import { RunnerConstructor, BaseWorkerRunnerResolver } from '@worker-runner/core';

export class WorkerRunnerResolver<R extends RunnerConstructor> extends BaseWorkerRunnerResolver<R> {}
