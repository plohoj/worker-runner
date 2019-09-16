import { NodeCommandResponse } from "./commands/node-command-response";
import { checkCommandType, INodeCommand, NodeCommand } from "./commands/node-commands";
import { IWorkerCommand, IWorkerCommandRunnerDestroyed, IWorkerCommandRunnerInit, IWorkerCommandRunnerResponse, WorkerCommand } from "./commands/worker-commands";
import { PromisesResolver } from "./runner-promises";

export class WorkerBridge {
    private runnersPromises = new Map<number, PromisesResolver<IWorkerCommandRunnerResponse>>();
    private initPromises = new PromisesResolver<IWorkerCommandRunnerInit>();
    private destroyPromises = new PromisesResolver<IWorkerCommandRunnerDestroyed>();
    private workerMessageHandler = this.onWorkerMessage.bind(this);
    private newRunnerInstanceId = 0;

    constructor(private worker: Worker) {
        this.worker.addEventListener('message', this.workerMessageHandler);
    }

    public execCommand<T extends NodeCommand>(command: INodeCommand<T>): Promise<IWorkerCommand<NodeCommandResponse<T>>> {
        this.sendCommand(command);
        if (checkCommandType(command, NodeCommand.INIT)) {
            return this.initPromises.promise(command.instanceId) as Promise<IWorkerCommand<NodeCommandResponse<T>>>;
        }
        if (checkCommandType(command, NodeCommand.EXECUTE)) {
            const runnerPromises = this.getRunnerPromises(command.instanceId);
            return runnerPromises.promise(command.commandId) as Promise<IWorkerCommand<NodeCommandResponse<T>>>;
        }
        if (checkCommandType(command, NodeCommand.DESTROY)) {
            return this.destroyPromises.promise(command.instanceId) as Promise<IWorkerCommand<NodeCommandResponse<T>>>;
        }
        throw Error(`Command "${command['type']}" not found`);
    }

    public resolveNewRunnerInstanceId(): number {
        return this.newRunnerInstanceId++;
    };

    public destroy(): void {
        this.worker.removeEventListener('message', this.workerMessageHandler);
    }

    private getRunnerPromises(id: number): PromisesResolver<IWorkerCommandRunnerResponse> {
        const runnerPromises = this.runnersPromises.get(id);
        if (runnerPromises) {
            return runnerPromises;
        }
        const newRunnerPromises = new PromisesResolver<IWorkerCommandRunnerResponse>();
        this.runnersPromises.set(id, newRunnerPromises);
        return newRunnerPromises;
    }

    private onWorkerMessage(message: MessageEvent): void {
        const command: IWorkerCommand = message.data;
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

    private sendCommand(command: INodeCommand): void {
        this.worker.postMessage(command);
    }
}
