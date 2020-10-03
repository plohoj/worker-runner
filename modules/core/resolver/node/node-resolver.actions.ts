import { IRunnerArgument } from '../../types/runner-argument';

export enum NodeResolverAction {
    INIT_RUNNER = 'INIT_RUNNER',
}

export interface INodeResolverInitRunnerAction {
    type: NodeResolverAction.INIT_RUNNER;
    runnerId: number;
    args: IRunnerArgument[];
    transfer: Transferable[]
}
