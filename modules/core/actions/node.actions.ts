import { IRunnerArgument } from '../types/runner-argument';

export enum NodeAction {
    INIT,
    EXECUTE,
    DESTROY,
    DESTROY_WORKER,
}

export interface INodeInitAction {
    type: NodeAction.INIT;
    instanceId: number;
    runnerId: number;
    arguments: IRunnerArgument[];
}

export interface INodeExecuteAction {
    type: NodeAction.EXECUTE;
    actionId: number;
    instanceId: number;
    method: string;
    arguments: IRunnerArgument[];
}

export interface INodeDestroyAction {
    type: NodeAction.DESTROY;
    instanceId: number;
}

export interface INodeWorkerDestroyAction {
    type: NodeAction.DESTROY_WORKER;
    /** Destroy by skipping the call the destruction method on the remaining instances */
    force?: boolean;
}

export type INodeAction<T extends NodeAction = NodeAction>
    = Extract<(INodeInitAction | INodeExecuteAction | INodeDestroyAction | INodeWorkerDestroyAction), {type: T}>;

