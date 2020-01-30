import { ClearNever, InjectDestroyerInRunner, JsonObject, ResolveRunnerMethod } from '@worker-runner/core';
import { Observable } from 'rxjs';

export type RxResolveRunnerMethod<T extends (...args: any) => any > =
    ReturnType<T> extends Observable<JsonObject | void> ?
        (...args: Parameters<T>) => Promise<ReturnType<T>>:
        ResolveRunnerMethod<T>; // TODO Resolve Rx

type RxResolveRunnerMethods<T> = {
    [P in keyof T]: T[P] extends (...args: any) => any ? RxResolveRunnerMethod<T[P]> : never;
};

export type RxResolveRunner<T> = InjectDestroyerInRunner<ClearNever<RxResolveRunnerMethods<T>>>;
