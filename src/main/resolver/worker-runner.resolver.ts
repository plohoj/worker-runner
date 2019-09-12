import { INodeCommand, NodeCommand } from "../commands/node-commands";
import { IWorkerCommand, WorkerCommand } from "../commands/worker-commands";
import { Constructor } from "../constructor";
import { RunnerResolverBase } from "./base-runner.resolver";

export function workerRunnerResolverMixin<R extends Constructor<{[key: string]: any}>, T extends new (...args: any[]) => RunnerResolverBase<R>>(runnerResolver: T) {
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
                    const runnerConstructor = this.config.runners[command.runnerId];
                    if (runnerConstructor) {
                        this.runners.set(command.runnerId, new runnerConstructor(...command.arguments) as InstanceType<R>);
                        this.sendCommand({
                            type: WorkerCommand.ON_RUNNER_INIT,
                            runnerId: command.runnerId,
                        });
                    } // TODO else Error                    
                    break;
                case NodeCommand.RUN:
                    const runner = this.runners.get(command.runnerId);
                    if (runner) {
                        // TODO catch error
                        const response = runner[command.method](...command.arguments);
                        if (response instanceof Promise) {
                            // TODO catch error
                            response.then(resolvedResponsed => this.sendCommand({
                                type: WorkerCommand.RUNNER_RESPONSE,
                                id: command.id,
                                runnerId: command.runnerId,
                                response: resolvedResponsed
                            }));
                        } else {
                            this.sendCommand({
                                type: WorkerCommand.RUNNER_RESPONSE,
                                id: command.id,
                                runnerId: command.runnerId,
                                response: response,
                            });
                        }
                    }  // TODO else Error
                    break;
            }
        }

        private sendCommand(command: IWorkerCommand): void {
            postMessage(command);
        }
    }
}
