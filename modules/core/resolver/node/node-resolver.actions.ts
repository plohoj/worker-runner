import { RunnerToken } from '../../runner/runner-bridge/runners-list.controller';
import { IRunnerArgument } from '../../types/runner-argument';

export enum NodeResolverAction {
    INIT_RUNNER = 'INIT_RUNNER',
}

export interface INodeResolverInitRunnerAction {
    type: NodeResolverAction.INIT_RUNNER;
    token: RunnerToken;
    args: IRunnerArgument[];
    transfer: Transferable[]
}
