import { NodeCommand } from "./node-commands";
import { WorkerCommand } from "./worker-commands";

class NodeCommandResponseMap implements Record<NodeCommand, WorkerCommand> {
    [NodeCommand.INIT]: WorkerCommand.ON_RUNNER_INIT;
    [NodeCommand.RUN]: WorkerCommand.RUNNER_RESPONSE;
    [NodeCommand.DESTROY]: WorkerCommand.ON_RUNNER_DESTROYED;
}

export type NodeCommandResponse<T extends NodeCommand> = NodeCommandResponseMap[T];
