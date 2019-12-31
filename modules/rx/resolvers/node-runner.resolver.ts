import { Constructor, NodeRunnerResolverBase, RunnerBridge, RunnerConstructor } from '@worker-runner/core';
import { RxResolveRunner } from '../resolved-runner';
import { RxWorkerBridge } from '../worker-bridge';

export type IRxRunnerBridgeConstructor<T extends RunnerConstructor>
    = Constructor<RxResolveRunner<InstanceType<T>>, ConstructorParameters<typeof RunnerBridge>>;

export class RxNodeRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolverBase<R> {

    public async resolve<RR extends R>(runner: RR, ...args: ConstructorParameters<RR>
    ): Promise<RxResolveRunner<InstanceType<RR>>> {
        const runnerId = this.config.runners.indexOf(runner);
        const workerBridge = this.getNextWorkerBridge();
        const instanceId = await this.sendInitAction(runnerId, args, workerBridge);
        return new (this.runnerBridgeConstructors[runnerId])(workerBridge, instanceId) as any;
    }

    protected async buildWorkerBridge(): Promise<RxWorkerBridge[]> {
        const workerBridgesInits$ = new Array<Promise<RxWorkerBridge>>();
        for (let i = 0; i < this.config.totalWorkers; i++) {
            const bridge = new RxWorkerBridge({
                workerPath: this.config.workerPath,
                workerName: `${this.config.namePrefix}${i}`,
            });
            workerBridgesInits$.push(bridge.init().then(() => bridge));
        }
        return Promise.all(workerBridgesInits$);
    }
}
