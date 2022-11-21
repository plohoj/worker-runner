import { IDestroyTarget } from '@worker-runner/core';
import { fromEventPattern, Observable } from 'rxjs';

export function observeDestroy(target: IDestroyTarget): Observable<void> {
    return fromEventPattern(
        handler => target.addDestroyHandler(handler),
        handler => target.removeDestroyHandler(handler),
    );
}
