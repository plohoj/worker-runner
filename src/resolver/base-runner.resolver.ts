import { Constructor } from "../constructor";

interface IRunnerResolverBaseConfig<R extends Constructor> {
    /** @default 1 */
    totalWorkers?: number;
    namePrefix?: string;
    runners: R[];
    workerPath: string;
    /**
     * Executing runners in the main thread for simplified debugging  
     * **Warning!** In this mode, a call to the runInWorker method is not required.
     * @default false
     */
    devMode?: boolean,
}

const DEFAULT_RUNNER_RESOLVER_BASE_CONFIG: Required<IRunnerResolverBaseConfig<never>> = {
    totalWorkers: 1,
    namePrefix: 'Runners Worker #',
    runners: [] as never[],
    workerPath: 'worker.js',
    devMode: false,
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