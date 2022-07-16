import { IAction } from '../types/action';

export function isAction<T extends IAction>(action: unknown): action is T {
    return !!(action as IAction | undefined)?.type;
}
