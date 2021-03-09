import { RunnerToken } from '../../runner/runner-bridge/runners-list.controller';
import { IRunnerArgument } from '../../types/runner-argument';

export enum ClientResolverAction {
    INIT_RUNNER = 'INIT_RUNNER',
}

export interface IClientResolverInitRunnerAction {
    type: ClientResolverAction.INIT_RUNNER;
    token: RunnerToken;
    args: IRunnerArgument[];
    transfer: Transferable[]
}
