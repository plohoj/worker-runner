import { NodeCommand } from "../commands/node-commands";
import { WorkerCommand } from "../commands/worker-commands";
import { Constructor } from "../constructor";
import { resolveRunnerBridgeConstructor } from "../runner/bridge-constructor.resolver";
import { ResolveRunner } from "../runner/resolved-runner";
import { RunnerBridge } from "../runner/runner-bridge";
import { WorkerBridge } from "../worker-bridge";
import { RunnerResolverBase } from "./base-runner.resolver";

export function nodeRunnerResolverMixin<R extends Constructor, T extends new (...args: any[]) => RunnerResolverBase<R>>(runnerResolver: T) {
    return class extends runnerResolver {
        private workers?: WorkerBridge[];
        private workerIndex = 0;
        private runnerBridgeConstructors = new Array<typeof RunnerBridge & Constructor<ResolveRunner<InstanceType<R>>>>();

        public run(): Promise<void> {
            const workers = new Array<Worker>();
            this.runnerBridgeConstructors = this.config.runners.map(runner => resolveRunnerBridgeConstructor(runner));
            return new Promise(resolve => {
                for (let i = 0; i < this.config.totalWorkers; i++) {
                    const worker = new Worker(this.config.workerPath, { name: `${this.config.namePrefix}${i}` });
                    worker.onmessage = (message) => {
                        if (message.data && message.data.type === WorkerCommand.ON_WORKER_INIT) {
                            workers.push(worker);
                            if (workers.length === this.config.totalWorkers) {
                                this.workers = workers.map(worker => new WorkerBridge(worker));
                                resolve();
                            }
                        }
                    };
                }
            });
        }
  
        public async resolve<RR extends R>(runner: RR, ...args: ConstructorParameters<RR>): Promise<ResolveRunner<InstanceType<RR>>> {
            const runnerId = this.config.runners.indexOf(runner);
            if (runnerId < 0) {
                throw new Error('Runner not found');
            }
            const workerBridge = this.getNextWorkerBridge();
            const initResult = await workerBridge.execCommand({
                type: NodeCommand.INIT,
                id: workerBridge.resolveNewRunnerId(),
                runnerId,
                arguments: args,
            });
            return new (this.runnerBridgeConstructors[runnerId])(workerBridge, initResult.runnerId);
        }

        public destroy(): void {
        }

        private getNextWorkerBridge(): WorkerBridge {
            if (!this.workers || this.workers.length === 0) {
                throw new Error('Workers was not started');
            }
            const workerIndex = this.workerIndex++;
            if (this.workerIndex >= this.workers.length) {
                this.workerIndex = 0;
            }
            return this.workers[workerIndex];
        }

    }
}
