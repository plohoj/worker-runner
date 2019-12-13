import { NodeRunnerResolverBase } from '@core/resolver/node-runner.resolver';
import { RunnerBridge } from '@core/runner/runner-bridge';
import { Constructor, RunnerConstructor } from '@core/types/constructor';
import { ResolveRunner } from './resolved-runner';

export type IRunnerBridgeConstructor<T extends RunnerConstructor>
    = Constructor<ResolveRunner<InstanceType<T>>, ConstructorParameters<typeof RunnerBridge>>;

export class NodeRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolverBase<R> {
    public async resolve<RR extends R>(runner: RR, ...args: ConstructorParameters<RR>
    ): Promise<InstanceType<IRunnerBridgeConstructor<RR>>> {
        const runnerId = this.config.runners.indexOf(runner);
        const workerBridge = await this.sendInitAction(runnerId, ...args);
        return new (this.runnerBridgeConstructors[runnerId])(workerBridge, runnerId) as any;
    }
}
