import { INodeCommand, NodeCommand } from "../commands/node-commands";
import { IWorkerCommand, WorkerCommand } from "../commands/worker-commands";
import { WorkerRunner } from "../worker-runner";
import { RunnerResolverBase } from "./base-resolver";

export function workerResolverMixin<R extends WorkerRunner, T extends new (...args: any[]) => RunnerResolverBase<R>>(runnerResolver: T) {
    return class extends runnerResolver {

        public runInWorker(): void {
            self.addEventListener('message', this.onMessage.bind(this));
            this.sendCommand({type: WorkerCommand.ON_INIT});
        }

        private onMessage(message: MessageEvent) {
            const data: INodeCommand = message.data;
            if (data.type === NodeCommand.INIT) {
                //@ts-ignore
                console.log(message.data.runner, this.config.runners[message.data.runner]);
            }
        }

        private sendCommand(command: IWorkerCommand): void {
            postMessage(command);
        }
    }
}
