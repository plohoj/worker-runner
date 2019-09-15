import { INodeCommand, INodeCommandDestroy, INodeCommandInit, INodeCommandRun, NodeCommand } from "../commands/node-commands";
import { IWorkerCommand, WorkerCommand } from "../commands/worker-commands";
import { Constructor } from "../constructor";
import { RunnerResolverBase } from "./base-runner.resolver";

export function workerRunnerResolverMixin<R extends Constructor<{[key: string]: any}>   , T extends new (...args: any[]) => RunnerResolverBase<R>>(runnerResolver: T) {
    return class extends runnerResolver {
        private runners = new Map<number, InstanceType<R>>();

        public runInWorker(): void {
            self.addEventListener('message', this.onMessage.bind(this));
            this.sendCommand({type: WorkerCommand.ON_WORKER_INIT});
        }

        private onMessage(message: MessageEvent): void {
            const command: INodeCommand = message.data;
            switch (command.type) {
                case NodeCommand.INIT: 
                    this.initRunnerInstance(command);                 
                    break;
                case NodeCommand.RUN:
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
                this.runners.set(command.runnerId, new runnerConstructor(...command.arguments) as InstanceType<R>);
                this.sendCommand({
                    type: WorkerCommand.ON_RUNNER_INIT,
                    instanceId: command.instanceId,
                });
            } // TODO else Error 
        }

        private executeCommand(command: INodeCommandRun): void {
            const runner = this.runners.get(command.instanceId);
            if (runner) {
                // TODO catch error
                const response = runner[command.method](...command.arguments);
                if (response instanceof Promise) {
                    // TODO catch error
                    response.then(resolvedResponse => this.sendCommand({
                        type: WorkerCommand.RUNNER_RESPONSE,
                        commandId: command.commandId,
                        instanceId: command.instanceId,
                        response: resolvedResponse
                    }));
                } else {
                    this.sendCommand({
                        type: WorkerCommand.RUNNER_RESPONSE,
                        commandId: command.commandId,
                        instanceId: command.instanceId,
                        response: response,
                    });
                }
            }  // TODO else Error
        }

        private destroyRunnerInstance(command: INodeCommandDestroy): void {
            const destroyRunner = this.runners.get(command.instanceId);
            if (destroyRunner) {
                let response: any;
                if (destroyRunner.destroy) {
                    // TODO catch error
                    response = (destroyRunner.destroy as Function)(...command.arguments);
                    if (response instanceof Promise) {
                        // TODO catch error
                        response.then(resolvedResponse => this.sendCommand({
                            type: WorkerCommand.ON_RUNNER_DESTROYED,
                            instanceId: command.instanceId,
                            response: resolvedResponse
                        }));
                    } else {
                        this.sendCommand({
                            type: WorkerCommand.ON_RUNNER_DESTROYED,
                            instanceId: command.instanceId,
                            response: response,
                        });
                    }
                } else {
                    this.sendCommand({
                        type: WorkerCommand.ON_RUNNER_DESTROYED,
                        instanceId: command.instanceId,
                        response: undefined,
                    });
                }
            }  // TODO else Error
        }

        private sendCommand(command: IWorkerCommand): void {
            postMessage(command);
        }
    }
}
