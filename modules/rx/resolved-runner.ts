import { ClearNever, JsonObject, SerializeRunnerDestroyer, SerializeRunnerMethod as SerializeRunnerPromiseMethod } from '@worker-runner/core';
import { Observable } from 'rxjs';

export type RxSerializeRunnerMethod<T extends (...args: any) => any > =
    ReturnType<T> extends Observable<JsonObject | void> ?
        (...args: Parameters<T>) => Promise<ReturnType<T>>:
        SerializeRunnerPromiseMethod<T>;

type RxIterateRunnerMethods<T> = {
    [P in keyof T]: T[P] extends (...args: any) => any ? RxSerializeRunnerMethod<T[P]> : never;
};

export type RxResolveRunner<T> = SerializeRunnerDestroyer<ClearNever<RxIterateRunnerMethods<T>>>;
