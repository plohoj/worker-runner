import { NodeRunnerResolverBase, ResolveRunner, RunnerConstructor } from '@worker-runner/core';

export class NodeRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolverBase<R> {
    public async resolve<RR extends R>(runner: RR, ...args: ConstructorParameters<RR>
    ): Promise<ResolveRunner<InstanceType<RR>>> {
        const runnerId = this.config.runners.indexOf(runner);
        const workerBridge = this.getNextWorkerBridge();
        const instanceId = await this.sendInitAction(runnerId, args, workerBridge);
        return new (this.runnerBridgeConstructors[runnerId])(workerBridge, instanceId);
    }
}
