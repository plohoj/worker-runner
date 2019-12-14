import { WorkerRunnerResolverBase } from '@core/resolver/worker-runner.resolver';
import { Constructor } from '@core/types/constructor';
import { JsonObject } from '@core/types/json-object';
import { RxRunnerState } from './runner-state';

export class WorkerRunnerResolver<R extends Constructor<{[key: string]: any}>> extends WorkerRunnerResolverBase<R> {

    protected declare runnerStates: Map<number, RxRunnerState<R>>;

    protected buildRunnerState(runnerConstructor: R, runnerArguments: JsonObject[]): RxRunnerState<R> {
        return new RxRunnerState({
            runnerConstructor,
            runnerArguments,
            workerRunnerResolver: this,
        });
    }
}
