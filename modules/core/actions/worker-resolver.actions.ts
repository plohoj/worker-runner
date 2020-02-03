export enum WorkerResolverAction {
    INIT,
    DESTROYED,
}

export interface IWorkerResolverInitAction {
    type: WorkerResolverAction.INIT;
}

export interface IWorkerResolverDestroyedAction {
    type: WorkerResolverAction.DESTROYED;
}

export type IWorkerResolverAction<T extends WorkerResolverAction = WorkerResolverAction> = Extract<
    IWorkerResolverInitAction | IWorkerResolverDestroyedAction,
    {type: T}
>;
