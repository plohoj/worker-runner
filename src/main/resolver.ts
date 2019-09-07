import { Command } from "./commands";
import { ResolveRunner } from "./resolved-runner";
import { WorkerRunner } from "./worker-runner";

interface IWorkerResolverConfig<R extends WorkerRunner> {
    totalWorkers?: number;
    namePrefix?: string;
    runners: R[];
    workerPath: string;
}

const DEFAULT_WORKER_CONFIG: Required<IWorkerResolverConfig<never>> = {
    totalWorkers: 4,
    namePrefix: 'Worker Instance #',
    runners: [],
    workerPath: 'worker.js',
}

export class WorkerResolver<R extends WorkerRunner> {
    private config: Required<IWorkerResolverConfig<R>>;
    private workers?: Worker[];

    constructor(config: IWorkerResolverConfig<R>) {
        this.config = {
            ...DEFAULT_WORKER_CONFIG,
            ...config,
        }
    }

    public resolve<RR extends R>(runner: RR): Promise<ResolveRunner<InstanceType<RR>>> {
        console.log(runner);
        const runnerIndex = this.config.runners.indexOf(runner);
        if (runnerIndex < 0) {
            return Promise.reject(new Error('Runner not found'));
        }
        if (this.workers) {
            this.workers[0].postMessage({
                command: Command.INIT,
                runner: runnerIndex,
            })
        };
        // @ts-ignore
        return Promise.resolve(new runner as RR);
    }

    public run(): Promise<void> {
        const workers = new Array<Worker>();
        return new Promise(resolve => {
            for (let i = 0; i < this.config.totalWorkers; i++) {
                const worker = new Worker(this.config.workerPath, { name: `${this.config.namePrefix}${i}` });
                worker.onmessage = () => {
                    workers.push(worker);
                    if (workers.length === this.config.totalWorkers) {
                        this.workers = workers;
                        resolve();
                    }
                };
            }
        });
    }

    public runInWorker(): void {
        postMessage('Worker Instance init');
        // @ts-ignore
        self.onmessage = async (message: MessageEvent) => {
            if (message.data.command === Command.INIT) {
                //@ts-ignore
                console.log(message.data.runner, this.config.runners[message.data.runner]);
            }
        }
    }
}