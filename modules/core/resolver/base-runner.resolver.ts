import { RunnersList } from '../runner/runner-bridge/runners-list.controller';

export interface IRunnerResolverConfigBase<L extends RunnersList> {
    runners: L;
}
