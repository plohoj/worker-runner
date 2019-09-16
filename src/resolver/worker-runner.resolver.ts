import { INodeCommand, INodeCommandDestroy, INodeCommandInit, INodeCommandRun, NodeCommand } from "../commands/node-commands";
import { IWorkerCommand, WorkerCommand } from "../commands/worker-commands";
import { WorkerErrorCode } from "../commands/worker-error-code";
import { Constructor } from "../constructor";
import { RunnerResolverBase } from "./base-runner.resolver";

export function workerRunnerResolverMixin<R extends Constructor<{[key: string]: any}>, T extends new (...args: any[]) => RunnerResolverBase<R>>(runnerResolver: T) {
    return class extends runnerResolver {
        private runnerInstances = new Map<number, InstanceType<R>>();

        public runInWorker(): void {
            self.addEventListener('message', this.onMessage.bind(this));
            this.sendCommand({type: WorkerCommand.WORKER_INIT});
        }

        private onMessage(message: MessageEvent): void {
            const command: INodeCommand = message.data;
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
                        errorCode: WorkerErrorCode.RUNNER_INIT_CONSTRUCTOR_ERROR,
                        error: this.transformError(error),
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
                    errorCode: WorkerErrorCode.RUNNER_INIT_CONSTRUCTOR_NOT_FOUND,
                    error: this.transformError(new Error('Runner constructor not found')),
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
                        errorCode: WorkerErrorCode.RUNNER_EXECUTE_ERROR,
                        error: this.transformError(error),
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
                        errorCode: WorkerErrorCode.RUNNER_EXECUTE_ERROR,
                        error: this.transformError(error),
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
                    errorCode: WorkerErrorCode.RUNNER_EXECUTE_INSTANCE_NOT_FOUND,
                    error: this.transformError(new Error('Runner instance not found')),
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
                        response = (destroyRunner.destroy as Function)(...command.arguments);
                    } catch (error) {
                        this.sendCommand({
                            type: WorkerCommand.RUNNER_DESTROY_ERROR,
                            errorCode: WorkerErrorCode.RUNNER_DESTROY_ERROR,
                            error: this.transformError(error),
                            instanceId: command.instanceId,
                        });
                        return;
                    }
                    if (response instanceof Promise) {
                        response.then(resolvedResponse => this.sendCommand({
                            type: WorkerCommand.RUNNER_DESTROYED,
                            instanceId: command.instanceId,
                            response: resolvedResponse
                        })).catch(error => this.sendCommand({
                            type: WorkerCommand.RUNNER_DESTROY_ERROR,
                            errorCode: WorkerErrorCode.RUNNER_DESTROY_ERROR,
                            error: this.transformError(error),
                            instanceId: command.instanceId,
                        }));
                    } else {
                        this.sendCommand({
                            type: WorkerCommand.RUNNER_DESTROYED,
                            instanceId: command.instanceId,
                            response: response,
                        });
                    }
                } else {
                    this.sendCommand({
                        type: WorkerCommand.RUNNER_DESTROYED,
                        instanceId: command.instanceId,
                        response: undefined,
                    });
                }
            }  else {
                this.sendCommand({
                    type: WorkerCommand.RUNNER_DESTROY_ERROR,
                    errorCode: WorkerErrorCode.RUNNER_DESTROY_INSTANCE_NOT_FOUND,
                    error: this.transformError(new Error('Runner instance not found')),
                    instanceId: command.instanceId,
                });
            }
        }

        private transformError(error: any): any {
            return JSON.parse(JSON.stringify(error))
        }

        private sendCommand(command: IWorkerCommand): void {
            postMessage(command);
        }
    }
}
