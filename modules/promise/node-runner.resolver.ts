import { NodeRunnerResolverBase } from '@core/resolver/node-runner.resolver';
import { IRunnerBridgeConstructor } from '@core/runner/runner-bridge';
import { RunnerConstructor } from '@core/types/constructor';

export class NodeRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolverBase<R> {
    public async resolve<RR extends R>(runner: RR, ...args: ConstructorParameters<RR>
    ): Promise<InstanceType<IRunnerBridgeConstructor<RR>>> {
        const runnerId = this.config.runners.indexOf(runner);
        const workerBridge = await this.sendInitCommand(runnerId, ...args);
        return new (this.runnerBridgeConstructors[runnerId])(workerBridge, runnerId);
    }
}
