import { Constructor } from "@core/constructor";
import { INodeCommand, INodeCommandDestroy, INodeCommandInit, INodeCommandRun, NodeCommand } from "../../../src/commands/node-commands";
import { IWorkerCommand, WorkerCommand } from "../../../src/commands/worker-commands";
import { extractError } from "../../../src/errors/extract-error";
import { RunnerErrorCode, RunnerErrorMessages } from "../../../src/errors/runners-errors";
import { IRunnerResolverConfigBase } from './base-runner.resolver';

export abstract class WorkerRunnerResolverBase<R extends Constructor<{[key: string]: any}>>{
    private runnerInstances = new Map<number, InstanceType<R>>();

    constructor(protected config: Required<IRunnerResolverConfigBase<R>>) {}

    public run(): void {
        self.addEventListener('message', this.onMessage.bind(this));
        this.sendCommand({type: WorkerCommand.WORKER_INIT});
    }

    private onMessage(message: MessageEvent): void {
        this.handleCommand(message.data)
    }

    public handleCommand(command: INodeCommand): void {
        switch (command.type) {
            case NodeCommand.INIT: 
                this.initRunnerInstance(command);                 
                break;
            case NodeCommand.EXECUTE:
                this.executeCommand(command);
                break;
            case NodeCommand.DESTROY:
                this.destroyRunnerInstance(command);
                break;
            case NodeCommand.DESTROY_WORKER:
                this.destroyWorker(command.force);
                break;
        }
    }

    private initRunnerInstance(command: INodeCommandInit): void {
        const runnerConstructor = this.config.runners[command.runnerId];
        if (runnerConstructor) {
            let instance: InstanceType<R> ;
            try {
                instance = new runnerConstructor(...command.arguments) as InstanceType<R>;
            } catch (error) {
                this.sendCommand({
                    type: WorkerCommand.RUNNER_INIT_ERROR,
                    instanceId: command.instanceId,
                    errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_ERROR,
                    ...extractError(error),
                });
                return;
            }
            this.runnerInstances.set(command.runnerId, instance);
            this.sendCommand({
                type: WorkerCommand.RUNNER_INIT,
                instanceId: command.instanceId,
            });
        } else {
            this.sendCommand({
                type: WorkerCommand.RUNNER_INIT_ERROR,
                instanceId: command.instanceId,
                errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_NOT_FOUND,
                error: RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
            });
        }
    }

    private executeCommand(command: INodeCommandRun): void {
        const runner = this.runnerInstances.get(command.instanceId);
        if (runner) {
            let response;
            try {
                response = runner[command.method](...command.arguments);
            } catch (error) {
                this.sendCommand({
                    type: WorkerCommand.RUNNER_EXECUTE_ERROR,
                    errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                    ...extractError(error),
                    commandId: command.commandId,
                    instanceId: command.instanceId,
                });
                return;
            }
            if (response instanceof Promise) {
                response.then(resolvedResponse => this.sendCommand({
                    type: WorkerCommand.RUNNER_EXECUTED,
                    commandId: command.commandId,
                    instanceId: command.instanceId,
                    response: resolvedResponse
                })).catch(error => this.sendCommand({
                    type: WorkerCommand.RUNNER_EXECUTE_ERROR,
                    errorCode: RunnerErrorCode.RUNNER_EXECUTE_ERROR,
                    ...extractError(error),
                    commandId: command.commandId,
                    instanceId: command.instanceId,
                }));
            } else {
                this.sendCommand({
                    type: WorkerCommand.RUNNER_EXECUTED,
                    commandId: command.commandId,
                    instanceId: command.instanceId,
                    response: response,
                });
            }
        }  else {
            this.sendCommand({
                type: WorkerCommand.RUNNER_EXECUTE_ERROR,
                errorCode: RunnerErrorCode.RUNNER_EXECUTE_INSTANCE_NOT_FOUND,
                error: RunnerErrorMessages.INSTANCE_NOT_FOUND,
                commandId: command.commandId,
                instanceId: command.instanceId,
            });
        }
    }

    private destroyRunnerInstance(command: INodeCommandDestroy): void {
        const destroyRunner = this.runnerInstances.get(command.instanceId);
        if (destroyRunner) {
            this.runnerInstances.delete(command.instanceId);
            let response: any;
            if (destroyRunner.destroy) {
                try {
                    response = (destroyRunner.destroy as Function)();
                } catch (error) {
                    this.sendCommand({
                        type: WorkerCommand.RUNNER_DESTROY_ERROR,
                        errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR,
                        ...extractError(error),
                        instanceId: command.instanceId,
                    });
                    return;
                }
                if (response instanceof Promise) {
                    response.then(resolvedResponse => this.sendCommand({
                        type: WorkerCommand.RUNNER_DESTROYED,
                        instanceId: command.instanceId,
                    })).catch(error => this.sendCommand({
                        type: WorkerCommand.RUNNER_DESTROY_ERROR,
                        errorCode: RunnerErrorCode.RUNNER_DESTROY_ERROR,
                        ...extractError(error),
                        instanceId: command.instanceId,
                    }));
                } else {
                    this.sendCommand({
                        type: WorkerCommand.RUNNER_DESTROYED,
                        instanceId: command.instanceId,
                    });
                }
            } else {
                this.sendCommand({
                    type: WorkerCommand.RUNNER_DESTROYED,
                    instanceId: command.instanceId,
                });
            }
        }  else {
            this.sendCommand({
                type: WorkerCommand.RUNNER_DESTROY_ERROR,
                errorCode: RunnerErrorCode.RUNNER_DESTROY_INSTANCE_NOT_FOUND,
                error: RunnerErrorMessages.INSTANCE_NOT_FOUND,
                instanceId: command.instanceId,
            });
        }
    }

    public async destroyWorker(force = false): Promise<void> {
        if (!force) {
            const destroying$ = new Array<Promise<any>>();
            this.runnerInstances.forEach(runner => {
                if ('destroy' in runner) {
                    let destroyResult: any;
                    try {
                        destroyResult = runner.destroy();
                    } catch {
                        return;
                    }
                    if (destroyResult instanceof Promise) {
                        destroying$.push(destroyResult.catch())
                    }
                }
            });
            await Promise.all(destroying$);
        }
        this.sendCommand({ type: WorkerCommand.WORKER_DESTROYED });
    }

    public sendCommand(command: IWorkerCommand): void {
        // @ts-ignore
        postMessage(command);
    }
}
