import { ErrorCollector } from '../../utils/error-collector';
import { parallelPromises } from '../../utils/parallel-promises';
import { RunnerEnvironmentClient } from "./runner-environment.client";

export class RunnerEnvironmentClientCollection {    
    private readonly environments = new Set<RunnerEnvironmentClient>();

    public add(runner: RunnerEnvironmentClient): void {
        this.environments.add(runner);
    }

    public remove(runner: RunnerEnvironmentClient): void {
        this.environments.delete(runner);
    }

    public async disconnect(errorCollector: ErrorCollector): Promise<void> {
        try {
            await parallelPromises({
                values: this.environments,
                stopAtFirstError: false,
                mapper: runnerEnvironment => runnerEnvironment.disconnect(),
                errorCollector: errorCollector,
            });
        } finally {
            this.environments.clear();
        }
    }

    public async destroy(errorCollector: ErrorCollector): Promise<void> {
        try {
            await parallelPromises({
                values: this.environments,
                stopAtFirstError: false,
                mapper: runnerEnvironment => runnerEnvironment.destroy(),
                errorCollector: errorCollector,
            });
        } finally {
            this.environments.clear();
        }
    }

}
