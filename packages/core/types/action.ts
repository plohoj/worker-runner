export type ActionType = string;

export interface IActionWithId<T extends ActionType = ActionType> extends IAction<T> {
    id: number;
}

export interface IAction<T extends ActionType = ActionType> {
    type: T;
}

export interface ITransferableAction<T extends ActionType = ActionType> extends IAction<T> {
    transfer?: Transferable[];
}

export type ActionHandler<T extends IAction = IAction> = (action: T) => void;
