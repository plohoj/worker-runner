import { JsonObject } from "@core/types/json-object";

export enum NodeCommand {
    INIT,
    EXECUTE,
    DESTROY,
    DESTROY_WORKER,
}

export interface INodeCommandInit {
    type: NodeCommand.INIT;
    instanceId: number;
    runnerId: number;
    arguments: JsonObject[];
}

export interface INodeCommandRun {
    type: NodeCommand.EXECUTE;
    commandId: number;
    instanceId: number;
    method: string;
    arguments: JsonObject[];
}

export interface INodeCommandDestroy {
    type: NodeCommand.DESTROY;
    instanceId: number;
}

export interface INodeCommandWorkerDestroy {
    type: NodeCommand.DESTROY_WORKER;
    /** Destroy by skipping the call the destruction method on the remaining instances */
    force?: boolean;
}

export type INodeCommand<T extends NodeCommand = NodeCommand>
    = Extract<(INodeCommandInit | INodeCommandRun | INodeCommandDestroy | INodeCommandWorkerDestroy), {type: T}>;

export function checkCommandType<T extends NodeCommand>(command: INodeCommand, type: T): command is INodeCommand<T> {
    return command.type === type;
}