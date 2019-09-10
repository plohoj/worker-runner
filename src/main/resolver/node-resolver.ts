import { IWorkerCommand } from "main/commands/worker-commands";
import { INodeCommand, NodeCommand } from "../commands/node-commands";
import { ResolveRunner } from "../resolved-runner";
import { WorkerRunner } from "../worker-runner";
import { RunnerResolverBase } from "./base-resolver";

export function nodeResolverMixin<R extends WorkerRunner, T extends new (...args: any[]) => RunnerResolverBase<R>>(runnerResolver: T) {
    return class extends runnerResolver {
        private workers?: Worker[];
        private initIndex?: number;

        public run(): Promise<void> {
            const workers = new Array<Worker>();
            return new Promise(resolve => {
                for (let i = 0; i < this.config.totalWorkers; i++) {
                    const worker = new Worker(this.config.workerPath, { name: `${this.config.namePrefix}${i}` });
                    worker.onmessage = () => {
                        workers.push(worker);
                        if (workers.length === this.config.totalWorkers) {
                            this.workers = workers;
                            for (let i = 0; i < workers.length; i++) {
                                workers[i].onmessage = this.onWorkerMessage.bind(this, i);
                                
                            }
                            for (const worker of workers) {
                                worker.onmessage = this.onWorkerMessage.bind(this, i);
                            }
                            resolve();
                        }
                    };
                }
            });
        }
  
        public async resolve<RR extends R>(runner: RR, ...args: ConstructorParameters<RR>): Promise<ResolveRunner<InstanceType<RR>>> {
            if (!this.workers || this.workers.length === 0) {
                await this.run();
            }
            const runnerId = this.config.runners.indexOf(runner);
            if (runnerId < 0) {
                throw new Error('Runner not found');
            }
            if (this.workers) {
                this.workers[0].postMessage({
                    type: NodeCommand.INIT,
                    runner: runnerId,
                    arguments: args,
                } as INodeCommand<NodeCommand.INIT>);
            };
            // @ts-ignore
            return new runner as RR;
        }

        public destroy(): void {
        }
    
        private onWorkerMessage(workerId: number, message: MessageEvent) {
            const command: IWorkerCommand = message.data;
        }

        private sendCommand(worker: Worker, command: INodeCommand): void {
            worker.postMessage(command);
        }
    }
}
