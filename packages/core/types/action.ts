export type ActionType = string;

export interface IActionWithId<T extends ActionType = ActionType> extends IAction<T> {
    id: number;
}

export interface IAction<T extends ActionType = ActionType> {
    type: T;
}

export type ActionHandler<T extends IAction = IAction> = (action: T) => void;
