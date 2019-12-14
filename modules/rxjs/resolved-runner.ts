import { SerializeRunnerDestroyer, SerializeRunnerMethod as SerializeRunnerPromiseMethod } from '@core/runner/resolved-runner';
import { ClearNever } from '@core/types/allowed-names';
import { JsonObject } from '@core/types/json-object';
import { Observable } from 'rxjs';

export type SerializeRunnerMethod<T extends (...args: any) => any > =
    ReturnType<T> extends Observable<JsonObject | void> ?
        (...args: Parameters<T>) => Promise<ReturnType<T>>:
        SerializeRunnerPromiseMethod<T>;

type IterateRunnerMethods<T> = {
    [P in keyof T]: T[P] extends (...args: any) => any ? SerializeRunnerMethod<T[P]> : never;
};

export type ResolveRunner<T> = SerializeRunnerDestroyer<ClearNever<IterateRunnerMethods<T>>>;
