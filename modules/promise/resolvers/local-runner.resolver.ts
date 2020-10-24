import { AnyRunnerFromList, LocalResolverBridge, ResolvedRunner, RunnersList } from '@worker-runner/core';
import { NodeRunnerResolver } from './node-runner.resolver';
import { WorkerRunnerResolver } from './worker-runner.resolver';

export class LocalRunnerResolver<L extends RunnersList> extends NodeRunnerResolver<L> {
    declare public wrapRunner: <R extends InstanceType<AnyRunnerFromList<L>>>(runnerInstance: R) => ResolvedRunner<R>;
    
    protected WorkerResolverConstructor = WorkerRunnerResolver;
    declare protected resolverBridge?: LocalResolverBridge<L>;

    protected buildResolverBridge(): void {
        this.resolverBridge = new LocalResolverBridge({
            workerRunnerResolverFactory: config => new WorkerRunnerResolver({
                ...config,
                runners: this.runnersListController.getRunnerList() as unknown as L,
            }),
        });
    }
}
