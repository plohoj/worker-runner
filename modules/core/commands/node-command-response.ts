import { NodeCommand } from "./node-commands";
import { WorkerCommand } from "./worker-commands";

class NodeCommandResponseMap implements Record<NodeCommand, WorkerCommand> {
    [NodeCommand.INIT]: WorkerCommand.RUNNER_INIT;
    [NodeCommand.EXECUTE]: WorkerCommand.RUNNER_EXECUTED;
    [NodeCommand.DESTROY]: WorkerCommand.RUNNER_DESTROYED;
    [NodeCommand.DESTROY_WORKER]: WorkerCommand.WORKER_DESTROYED;
}

export type NodeCommandResponse<T extends NodeCommand> = NodeCommandResponseMap[T];
