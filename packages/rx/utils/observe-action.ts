import { IActionTarget, IAction } from '@worker-runner/core';
import { fromEventPattern, Observable } from 'rxjs';

export function observeAction<T extends IAction>(target: IActionTarget<T>): Observable<T> {
    return fromEventPattern(
        handler => target.addActionHandler(handler),
        handler => target.removeActionHandler(handler),
    );
}
