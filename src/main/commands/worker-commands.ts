export enum WorkerCommand {
    ON_INIT,
}

interface IWorkerCommandOnInit {
    type: WorkerCommand.ON_INIT;
}

export type IWorkerCommand<T extends WorkerCommand = WorkerCommand> = Extract<IWorkerCommandOnInit, {type: T}>;