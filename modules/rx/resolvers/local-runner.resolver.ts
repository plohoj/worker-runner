import { AnyRunnerFromList, LocalResolverBridge, RunnersList } from '@worker-runner/core';
import { RxResolvedRunner } from '../runners/resolved-runner';
import { RxNodeRunnerResolver } from './node-runner.resolver';
import { RxWorkerRunnerResolver } from './worker-runner.resolver';

export class RxLocalRunnerResolver<L extends RunnersList> extends RxNodeRunnerResolver<L> {
    declare public wrapRunner: <R extends InstanceType<AnyRunnerFromList<L>>>(runnerInstance: R) => RxResolvedRunner<R>;
    protected WorkerResolverConstructor =  RxWorkerRunnerResolver;
    declare protected resolverBridge?: LocalResolverBridge<L>;

    protected buildResolverBridge(): void {
        this.resolverBridge = new LocalResolverBridge({
            workerRunnerResolverFactory: config => new RxWorkerRunnerResolver({
                ...config,
                runners: this.runnersListController.getRunnerList() as unknown as L,
            }),
        });
    }
}
