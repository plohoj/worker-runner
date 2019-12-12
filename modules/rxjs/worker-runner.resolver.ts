import { INodeCommandRun } from '@core/commands/node-commands';
import { WorkerRunnerResolverBase } from '@core/resolver/worker-runner.resolver';
import { Constructor } from '@core/types/constructor';

export class WorkerRunnerResolver<R extends Constructor<{[key: string]: any}>> extends WorkerRunnerResolverBase<R> {
    protected handleExecuteResponse(command: INodeCommandRun, response: any): void {
        super.handleExecuteResponse(command, response);
        // TODO
    }
}
