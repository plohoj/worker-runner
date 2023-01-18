import { IDestroyHandlersTarget } from '@worker-runner/core';
import { fromEventPattern, Observable } from 'rxjs';

export function observeDestroy(target: IDestroyHandlersTarget): Observable<void> {
    return fromEventPattern(
        handler => target.addDestroyHandler(handler),
        handler => target.removeDestroyHandler(handler),
    );
}
