import { ActionHandler, IAction } from './action';

export interface IActionTarget<T extends IAction = IAction> {
    addActionHandler: (handler: ActionHandler<T>) => void;
    removeActionHandler: (handler: ActionHandler<T>) => void;
}
