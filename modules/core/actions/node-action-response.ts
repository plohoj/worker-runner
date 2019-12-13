import { NodeAction } from './node.actions';
import { WorkerAction } from './worker.actions';

class NodeActionResponseMap implements Record<NodeAction, WorkerAction> {
    [NodeAction.INIT]: WorkerAction.RUNNER_INIT;
    [NodeAction.EXECUTE]: WorkerAction.RUNNER_EXECUTED;
    [NodeAction.DESTROY]: WorkerAction.RUNNER_DESTROYED;
    [NodeAction.DESTROY_WORKER]: WorkerAction.WORKER_DESTROYED;
}

export type NodeActionResponse<T extends NodeAction> = NodeActionResponseMap[T];
