import { WorkerRunner } from "main/worker-runner";

interface IRunnerResolverConfig<R extends WorkerRunner> {
    totalWorkers?: number;
    namePrefix?: string;
    runners: R[];
    workerPath: string;
}

const DEFAULT_WORKER_CONFIG: Required<IRunnerResolverConfig<never>> = {
    totalWorkers: 4,
    namePrefix: 'Worker Instance #',
    runners: [],
    workerPath: 'worker.js',
}

export class RunnerResolverBase<R extends WorkerRunner> {
    protected config: Required<IRunnerResolverConfig<R>>;

    constructor(config: IRunnerResolverConfig<R>) {
        this.config = {
            ...DEFAULT_WORKER_CONFIG,
            ...config,
        }
    }
}