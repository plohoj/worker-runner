export enum NodeCommand {
    INIT,
    RUN,
    DESTROY,
}

export interface INodeCommandInit {
    type: NodeCommand.INIT;
    instanceId: number;
    runnerId: number;
    arguments: any[];
}

export interface INodeCommandRun {
    type: NodeCommand.RUN;
    commandId: number;
    instanceId: number;
    method: string;
    arguments: any[];
}

export interface INodeCommandDestroy {
    type: NodeCommand.DESTROY;
    instanceId: number;
    arguments: any[];
}

export type INodeCommand<T extends NodeCommand = NodeCommand>
    = Extract<(INodeCommandInit | INodeCommandRun | INodeCommandDestroy), {type: T}>;

export function checkCommandType<T extends NodeCommand>(command: INodeCommand, type: T): command is INodeCommand<T> {
    return command.type === type;
}