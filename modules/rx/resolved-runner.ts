import { InjectDestroyerInRunner, IRunnerParameter, JsonObject, ResolveRunnerArguments } from '@worker-runner/core';
import { Observable } from 'rxjs';

type RxResolveRunnerArgument<T>
    = T extends JsonObject ? T : never;

export type RxResolveRunnerArguments<T extends IRunnerParameter[]>
    = { [P in keyof T]: RxResolveRunnerArgument<T[P]> };

export type RxResolveRunnerMethod<T extends (...args: any[]) => any, A extends any[] = Parameters<T>> =
    ReturnType<T> extends Observable<JsonObject | void> ?
        (...args: Parameters<T>) => Promise<ReturnType<T>>:
        ReturnType<T> extends JsonObject | void ?
            (...args: ResolveRunnerArguments<A>) => Promise<ReturnType<T>>:
            ReturnType<T> extends Promise<infer R> ?
                R extends JsonObject | void ?
                    (...args: ResolveRunnerArguments<A>) => ReturnType<T> :
                    never :
                never;

type RxResolveRunnerMethods<T> = {
    [P in keyof T]: T[P] extends (...args: any[]) => any ? RxResolveRunnerMethod<T[P]> : never;
};

export type RxResolveRunner<T> = InjectDestroyerInRunner<RxResolveRunnerMethods<T>>;
