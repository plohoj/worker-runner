
export enum NodeResolverAction {
    DESTROY,
}

export interface INodeResolverWorkerDestroyAction {
    type: NodeResolverAction.DESTROY;
    /** Destroy by skipping the call the destruction method on the remaining instances */
    force?: boolean;
}
