export enum NodeCommand {
    INIT,
    RUN,
}

export interface INodeCommandInit {
    type: NodeCommand.INIT;
    runnerId: number;
    arguments: any[];
}

export interface INodeCommandRun {
    type: NodeCommand.RUN;
    id: number;
    runnerId: number;
    method: string;
}

export type INodeCommand<T extends NodeCommand = NodeCommand> = Extract<(INodeCommandInit | INodeCommandRun), {type: T}>;
