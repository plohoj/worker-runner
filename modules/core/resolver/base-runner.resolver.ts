import { RunnerConstructor } from '../types/constructor';

export interface IRunnerResolverConfigBase<R extends RunnerConstructor> {
    runners: R[];
}
