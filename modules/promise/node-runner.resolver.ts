import { NodeRunnerResolverBase } from '@core/resolver/node-runner.resolver';
import { ResolveRunner } from '@core/runner/resolved-runner';
import { RunnerConstructor } from '@core/types/constructor';

export class NodeRunnerResolver<R extends RunnerConstructor> extends NodeRunnerResolverBase<R> {
    public async resolve<RR extends R>(runner: RR, ...args: ConstructorParameters<RR>
    ): Promise<ResolveRunner<InstanceType<RR>>> {
        const runnerId = this.config.runners.indexOf(runner);
        const workerBridge = await this.sendInitAction(runnerId, ...args);
        return new (this.runnerBridgeConstructors[runnerId])(workerBridge, runnerId);
    }
}
