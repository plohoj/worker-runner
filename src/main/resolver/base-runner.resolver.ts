import { Constructor } from "main/constructor";

interface IRunnerResolverBaseConfig<R extends Constructor> {
    totalWorkers?: number;
    namePrefix?: string;
    runners: R[];
    workerPath: string;
}

const DEFAULT_RUNNER_RESOLVER_BASE_CONFIG: Required<IRunnerResolverBaseConfig<never>> = {
    totalWorkers: 4,
    namePrefix: 'Worker Instance #',
    runners: [],
    workerPath: 'worker.js',
}

export class RunnerResolverBase<R extends Constructor> {
    protected config: Required<IRunnerResolverBaseConfig<R>>;

    constructor(config: IRunnerResolverBaseConfig<R>) {
        this.config = {
            ...DEFAULT_RUNNER_RESOLVER_BASE_CONFIG,
            ...config,
        }
    }
}