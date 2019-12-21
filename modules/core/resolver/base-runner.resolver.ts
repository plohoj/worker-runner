import { RunnerConstructor } from '@core/types/constructor';

export interface IRunnerResolverConfigBase<R extends RunnerConstructor> {
    runners: R[];
}
