import { ClearNever, InjectDestroyerInRunner, IRunnerParameter, JsonObject } from '@worker-runner/core';
import { Observable } from 'rxjs';

type RxResolveRunnerArgument<T>
    = T extends JsonObject ? T : RxResolveRunner<T>;

export type RxResolveRunnerArguments<T extends IRunnerParameter[]>
    = { [P in keyof T]: RxResolveRunnerArgument<T[P]> };

export type RxResolveRunnerMethod<T extends (...args: any[]) => any, A extends any[] = Parameters<T>> = // TODO as core
    ReturnType<T> extends Observable<JsonObject | void> ?
        (...args: Parameters<T>) => Promise<ReturnType<T>>:
        ReturnType<T> extends Promise<JsonObject | void> ?
            T :
            ReturnType<T> extends JsonObject | void ?
                (...args: RxResolveRunnerArguments<A>) => Promise<ReturnType<T>> :
                never;

type RxResolveRunnerMethods<T> = ClearNever<{
    [P in keyof T]: T[P] extends (...args: any[]) => any ? RxResolveRunnerMethod<T[P]> : never;
}>;

export type RxResolveRunner<T> = InjectDestroyerInRunner<RxResolveRunnerMethods<T>>;
