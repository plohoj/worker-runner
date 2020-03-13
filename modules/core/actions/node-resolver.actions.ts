import { IRunnerArgument } from '../types/runner-argument';

export enum NodeResolverAction {
    INIT_RUNNER,
    DESTROY,
}

export interface INodeResolverWorkerDestroyAction {
    type: NodeResolverAction.DESTROY;
    /** Destroy by skipping the call the destruction method on the remaining instances */
    force?: boolean;
}

export interface INodeResolverInitRunnerAction {
    type: NodeResolverAction.INIT_RUNNER;
    id: number;
    runnerId: number;
    args: IRunnerArgument[];
}

export type INodeResolverAction<T extends NodeResolverAction = NodeResolverAction> = Extract<
    INodeResolverWorkerDestroyAction | INodeResolverInitRunnerAction,
    {type: T}
>;
