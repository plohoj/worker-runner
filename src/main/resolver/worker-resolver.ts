import { INodeCommand, NodeCommand } from "../commands/node-commands";
import { IWorkerCommand, WorkerCommand } from "../commands/worker-commands";
import { WorkerRunner } from "../worker-runner";
import { RunnerResolverBase } from "./base-resolver";

export function workerResolverMixin<R extends WorkerRunner, T extends new (...args: any[]) => RunnerResolverBase<R>>(runnerResolver: T) {
    return class extends runnerResolver {
        private runners = new Map<number, R>();

        public runInWorker(): void {
            self.addEventListener('message', this.onMessage.bind(this));
            this.sendCommand({type: WorkerCommand.ON_WORKER_INIT});
        }

        private onMessage(message: MessageEvent) {
            const data: INodeCommand = message.data;
            switch (data.type) {
                case NodeCommand.INIT: 
                    const runnerConstructor = this.config.runners[data.runnerId];
                    if (runnerConstructor) {
                        this.runners.set(data.runnerId, new runnerConstructor(...data.arguments) as R);
                    } // TODO else Error
                    this.sendCommand({
                        type: WorkerCommand.ON_RUNNER_INIT,
                        runnerId: data.runnerId,
                    });
                    break;
            }
        }

        private sendCommand(command: IWorkerCommand): void {
            postMessage(command);
        }
    }
}
