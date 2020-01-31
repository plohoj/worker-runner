import { IRunnerConstructorParameter, NodeRunnerResolverBase, ResolveRunner, ResolveRunnerArguments, RunnerConstructor } from '@worker-runner/core';

export class NodeRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolverBase<R> {

    private executeHandler = this.execute.bind(this);

    public async resolve<RR extends R>(
        runner: RR,
        ...args: RR extends new (...args: infer A) => any ?
            A extends Array<IRunnerConstructorParameter> ? ResolveRunnerArguments<A> : never : never
    ): Promise<ResolveRunner<InstanceType<RR>>> {
        const runnerId = this.config.runners.indexOf(runner);
        const instanceId = await this.sendInitAction(runnerId, args);
        return new (this.runnerBridgeConstructors[runnerId])(this.executeHandler, instanceId);
    }
}
