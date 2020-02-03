import { IRunnerConstructorParameter, NodeRunnerResolverBase, ResolveRunner, ResolveRunnerArguments, RunnerConstructor } from '@worker-runner/core';

export class NodeRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolverBase<R> {

    public async resolve<RR extends R>(
        runner: RR,
        ...args: RR extends new (...args: infer A) => any ?
            A extends Array<IRunnerConstructorParameter> ? ResolveRunnerArguments<A> : never : never
    ): Promise<ResolveRunner<InstanceType<RR>>> {
        const runnerId = this.config.runners.indexOf(runner);
        const action = await this.sendInitAction(runnerId, args);
        return this.buildRunnerController(action, runnerId).resolvedRunner;
    }
}
