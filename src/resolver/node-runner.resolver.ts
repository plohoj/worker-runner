import { NodeCommand } from "../commands/node-commands";
import { errorCommandToRunnerError, IRunnerError } from "../commands/runner-error";
import { WorkerCommand } from "../commands/worker-commands";
import { Constructor } from "../constructor";
import { RunnerErrorCode, RunnerErrorMessages } from "../errors/runners-errors";
import { resolveRunnerBridgeConstructor } from "../runner/bridge-constructor.resolver";
import { IRunnerBridgeConstructor } from "../runner/runner-bridge";
import { WorkerBridge } from "../worker-bridge";
import { RunnerResolverBase } from "./base-runner.resolver";

export function nodeRunnerResolverMixin<R extends Constructor, T extends new (...args: any[]) => RunnerResolverBase<R>>(runnerResolver: T) {
    return class extends runnerResolver {
        private workers?: WorkerBridge[];
        private workerIndex = 0;
        private runnerBridgeConstructors = new Array<IRunnerBridgeConstructor<R>>();

        public run(): Promise<void> {
            const workers = new Array<Worker>();
            this.runnerBridgeConstructors = this.config.runners.map(runner => resolveRunnerBridgeConstructor(runner));
            return new Promise(resolve => {
                for (let i = 0; i < this.config.totalWorkers; i++) {
                    const worker = new Worker(this.config.workerPath, { name: `${this.config.namePrefix}${i}` });
                    worker.onmessage = (message) => {
                        if (message.data && message.data.type === WorkerCommand.WORKER_INIT) {
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
  
        public async resolve<RR extends R>(runner: RR, ...args: ConstructorParameters<RR>): Promise<InstanceType<IRunnerBridgeConstructor<RR>>> {
            const runnerId = this.config.runners.indexOf(runner);
            if (runnerId < 0) {
                throw {
                    error: RunnerErrorMessages.CONSTRUCTOR_NOT_FOUND,
                    errorCode: RunnerErrorCode.RUNNER_INIT_CONSTRUCTOR_NOT_FOUND,
                } as IRunnerError;
            }
            const workerBridge = this.getNextWorkerBridge();
            try {
                await workerBridge.execCommand({
                    type: NodeCommand.INIT,
                    instanceId: workerBridge.resolveNewRunnerInstanceId(),
                    runnerId,
                    arguments: args,
                });
            } catch (error) {
                throw errorCommandToRunnerError(error);
            }
            return new (this.runnerBridgeConstructors[runnerId])(workerBridge, runnerId);
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
