import { NodeCommandResponse } from "../commands/node-command-response";
import { checkCommandType, INodeCommand, NodeCommand } from "../commands/node-commands";
import { IWorkerCommand, IWorkerCommandRunnerDestroyed, IWorkerCommandRunnerInit, IWorkerCommandRunnerResponse, WorkerCommand } from "../commands/worker-commands";
import { PromisesResolver } from "../runner-promises";

export abstract class WorkerBridgeBase {
    private runnersPromises = new Map<number, PromisesResolver<IWorkerCommandRunnerResponse>>();
    private initPromises = new PromisesResolver<IWorkerCommandRunnerInit>();
    private destroyPromises = new PromisesResolver<IWorkerCommandRunnerDestroyed>();
    private newRunnerInstanceId = 0;

    public execCommand<T extends NodeCommand>(command: INodeCommand<T>): Promise<IWorkerCommand<NodeCommandResponse<T>>> {
        let promise$: Promise<IWorkerCommand<NodeCommandResponse<T>>> | undefined;
        if (checkCommandType(command, NodeCommand.INIT)) {
            promise$ = this.initPromises.promise(command.instanceId) as Promise<IWorkerCommand<NodeCommandResponse<T>>>;
        }
        if (checkCommandType(command, NodeCommand.EXECUTE)) {
            const runnerPromises = this.getRunnerPromises(command.instanceId);
            promise$ = runnerPromises.promise(command.commandId) as Promise<IWorkerCommand<NodeCommandResponse<T>>>;
        }
        if (checkCommandType(command, NodeCommand.DESTROY)) {
            promise$ = this.destroyPromises.promise(command.instanceId) as Promise<IWorkerCommand<NodeCommandResponse<T>>>;
        }
        if (promise$) {
            this.sendCommand(command);
            return promise$;
        }
        throw Error(`Command "${command['type']}" not found`);
    }

    public resolveNewRunnerInstanceId(): number {
        return this.newRunnerInstanceId++;
    };

    public abstract destroy(): void

    private getRunnerPromises(id: number): PromisesResolver<IWorkerCommandRunnerResponse> {
        const runnerPromises = this.runnersPromises.get(id);
        if (runnerPromises) {
            return runnerPromises;
        }
        const newRunnerPromises = new PromisesResolver<IWorkerCommandRunnerResponse>();
        this.runnersPromises.set(id, newRunnerPromises);
        return newRunnerPromises;
    }

    protected onWorkerMessage(message: MessageEvent): void {
        this.handleWorkerCommand(message.data);
    }

    protected handleWorkerCommand(command: IWorkerCommand) {
        switch (command.type) {
            case WorkerCommand.RUNNER_INIT:
                this.initPromises.resolve(command.instanceId, command)
                break;
            case WorkerCommand.RUNNER_INIT_ERROR:
                this.initPromises.reject(command.instanceId, command);
                break;
            case WorkerCommand.RUNNER_EXECUTED:
                const runnerPromises = this.runnersPromises.get(command.instanceId);
                if (runnerPromises) {
                    runnerPromises.resolve(command.commandId, command);
                }
                break;
            case WorkerCommand.RUNNER_EXECUTE_ERROR:
                const promises = this.runnersPromises.get(command.instanceId);
                if (promises) {
                    promises.reject(command.commandId, command);
                }
                break;
            case WorkerCommand.RUNNER_DESTROYED:
                this.destroyPromises.resolve(command.instanceId, command);
                this.runnersPromises.delete(command.instanceId);
                break;
            case WorkerCommand.RUNNER_DESTROY_ERROR:
                this.destroyPromises.reject(command.instanceId, command);
                this.runnersPromises.delete(command.instanceId);
                break;
        }
    }

    protected abstract sendCommand(command: INodeCommand): void
}
