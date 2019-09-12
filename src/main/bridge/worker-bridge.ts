import { NodeCommandResponse } from "../commands/node-command-response";
import { INodeCommand, NodeCommand } from "../commands/node-commands";
import { IWorkerCommand, IWorkerCommandOnRunnerInit, IWorkerCommandRunnerResponse, WorkerCommand } from "../commands/worker-commands";
import { RunnerPromises } from "./runner-promises";

export class WorkerBridge {
    private runnersPromises = new Map<number, RunnerPromises<IWorkerCommandRunnerResponse>>();
    private initPromises = new RunnerPromises<IWorkerCommandOnRunnerInit>();
    private workerMessageHandler = this.onWorkerMessage.bind(this);
    private newRunnerId = 0;

    constructor(private worker: Worker) {
        this.worker.addEventListener('message', this.workerMessageHandler);
    }

    public execCommand<T extends NodeCommand>(command: INodeCommand<T>): Promise<IWorkerCommand<NodeCommandResponse<T>>> {
        switch (command.type) {
            case NodeCommand.INIT:
                this.sendCommand(command);
                return this.initPromises.promise(command.runnerId) as Promise<IWorkerCommand<NodeCommandResponse<T>>>;
            case NodeCommand.RUN:
                this.sendCommand(command);
                const runnerPromises = this.getRunnerPromises(command.runnerId);
                return runnerPromises.promise(command.id) as Promise<IWorkerCommand<NodeCommandResponse<T>>>;
        }
        throw Error(`Command "${command.type}" not found`);
    }

    public resolveNewRunnerId(): number {
        return this.newRunnerId++;
    };

    public destroy(): void {
        this.worker.removeEventListener('message', this.workerMessageHandler);
    }

    private getRunnerPromises(id: number): RunnerPromises<IWorkerCommandRunnerResponse> {
        const runnerPromises = this.runnersPromises.get(id);
        if (runnerPromises) {
            return runnerPromises;
        }
        const newRunnerPromises = new RunnerPromises<IWorkerCommandRunnerResponse>();
        this.runnersPromises.set(id, newRunnerPromises);
        return newRunnerPromises;
    }

    private onWorkerMessage(message: MessageEvent): void {
        const command: IWorkerCommand = message.data;
        switch (command.type) {
            case WorkerCommand.ON_RUNNER_INIT:
                this.initPromises.resolve(command.runnerId, command)
                break;
            case WorkerCommand.RUNNER_RESPONSE:
                const runnerPromises = this.runnersPromises.get(command.runnerId);
                if (runnerPromises) {
                    runnerPromises.resolve(command.id, command);
                }
                break;
        }
    }

    private sendCommand(command: INodeCommand): void {
        this.worker.postMessage(command);
    }
}
