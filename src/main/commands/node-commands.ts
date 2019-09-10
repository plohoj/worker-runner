export enum NodeCommand {
    INIT,
    RUN,
}

interface INodeCommandInit {
    type: NodeCommand.INIT;
    runner: number;
    arguments: any[];
}

interface INodeCommandRun {
    type: NodeCommand.RUN;
    runner: number;
    method: string;
}

export type INodeCommand<T extends NodeCommand = NodeCommand> = Extract<(INodeCommandInit | INodeCommandRun), {type: T}>;
