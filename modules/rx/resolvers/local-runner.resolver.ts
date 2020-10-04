import { LocalResolverBridge, RunnerConstructor } from '@worker-runner/core';
import { RxResolvedRunner } from '../runners/resolved-runner';
import { RxNodeRunnerResolver } from './node-runner.resolver';
import { RxWorkerRunnerResolver } from './worker-runner.resolver';

export class RxLocalRunnerResolver<R extends RunnerConstructor> extends RxNodeRunnerResolver<R> {
    declare public wrapRunner: <RR extends InstanceType<R>>(runnerInstance: RR) => RxResolvedRunner<RR>;
    protected WorkerResolverConstructor =  RxWorkerRunnerResolver;
    declare protected resolverBridge?: LocalResolverBridge<R>;

    protected buildResolverBridge(): void {
        this.resolverBridge = new LocalResolverBridge({
            workerRunnerResolverFactory: config => new RxWorkerRunnerResolver({
                ...config,
                runners: this.runnerBridgeCollection.runners,
            }),
        });
    }
}
