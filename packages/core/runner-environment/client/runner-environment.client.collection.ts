import { RunnerDestroyError } from '../../errors/runner-errors';
import { MultipleErrorFactory, parallelPromises } from '../../utils/parallel.promises';
import { RunnerEnvironmentClient } from "./runner-environment.client";


export class RunnerEnvironmentClientCollection {    
    private readonly environments = new Set<RunnerEnvironmentClient>();

    public add(runner: RunnerEnvironmentClient): void {
        this.environments.add(runner);
    }

    public remove(runner: RunnerEnvironmentClient): void {
        this.environments.delete(runner);
    }

    public async disconnect(errorFactory: MultipleErrorFactory = this.destroyErrorFactory): Promise<void> {
        try {
            await parallelPromises({
                values: this.environments,
                stopAtFirstError: false,
                mapper: runnerEnvironment => runnerEnvironment.disconnect(),
                errorFactory,
            });
        } finally {
            this.environments.clear();
        }
    }

    public async destroy(errorFactory: MultipleErrorFactory = this.destroyErrorFactory): Promise<void> {
        try {
            await parallelPromises({
                values: this.environments,
                stopAtFirstError: false,
                mapper: environmentClient => environmentClient.destroy(),
                errorFactory,
            });
        } finally {
            this.environments.clear();
        }
    }

    private destroyErrorFactory = (originalErrors: unknown[]): RunnerDestroyError => {
        return new RunnerDestroyError({ 
            originalErrors,
        });
    }
}
