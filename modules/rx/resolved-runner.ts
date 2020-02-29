import { JsonObject, ResolveRunnerArguments, RunnerBridge } from '@worker-runner/core';
import { Observable } from 'rxjs';

export type IRxRunnerParameter = JsonObject | RxResolveRunner<any>;

type RxResolveRunnerArgument<T> = T extends IRxRunnerParameter ? T : never;

export type RxResolveRunnerArguments<T extends IRxRunnerParameter[]>
    = { [P in keyof T]: RxResolveRunnerArgument<T[P]> };

export type RxResolveRunnerMethod<T extends (...args: any[]) => any, A extends any[] = Parameters<T>> =
    ReturnType<T> extends Observable<JsonObject | void> ?
        (...args: Parameters<T>) => Promise<ReturnType<T>>:
        ReturnType<T> extends IRxRunnerParameter ?
            (...args: ResolveRunnerArguments<A>) => Promise<ReturnType<T>>:
            ReturnType<T> extends Promise<infer R> ?
                R extends IRxRunnerParameter ?
                    (...args: ResolveRunnerArguments<A>) => ReturnType<T> :
                    never :
                never;

type RxResolveRunnerMethods<T> = {
    [P in keyof T]: T[P] extends (...args: any[]) => any ? RxResolveRunnerMethod<T[P]> : never;
};

export type RxResolveRunner<T> = RxResolveRunnerMethods<T> & RunnerBridge;
