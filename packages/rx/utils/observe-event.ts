import { EventHandlerController } from '@worker-runner/core';
import { fromEventPattern, Observable } from 'rxjs';

export function observeEvent<T>(target: EventHandlerController<T>): Observable<T> {
    return fromEventPattern(
        handler => target.addHandler(handler),
        handler => target.removeHandler(handler),
    );
}
