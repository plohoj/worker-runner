import { RunnerConstructor } from '@worker-runner/core';
import { NodeRunnerResolver } from './node-runner.resolver';
import { WorkerRunnerResolver } from './worker-runner.resolver';

const stub = () => {
    // stub
};

export class LocalRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolver<R> {
    protected workerResolverConstructor = WorkerRunnerResolver;
}
