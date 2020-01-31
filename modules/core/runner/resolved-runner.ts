import { ClearNever } from '../types/allowed-names';
import { IRunnerConstructorParameter } from '../types/constructor';
import { JsonObject } from '../types/json-object';

type ResolveRunnerArgument<T extends IRunnerConstructorParameter>
    = T extends JsonObject ? T : ResolveRunner<T>;

export type ResolveRunnerArguments<T extends IRunnerConstructorParameter[]>
    = { [P in keyof T]: ResolveRunnerArgument<T[P]> };

export type ResolveRunnerMethod<T extends (...args: any[]) => any, A extends any[] = Parameters<T>> =
    ReturnType<T> extends Promise<JsonObject | void> ?
        T :
        ReturnType<T> extends JsonObject | void ?
            (...args: ResolveRunnerArguments<A>) => Promise<ReturnType<T>> :
            never;

type ResolveRunnerMethods<T> = ClearNever<{
    [P in keyof T]: T[P] extends (...args: any[]) => any ? ResolveRunnerMethod<T[P]> : never;
}>;

interface IRunnerWithDestroyer {
    /** Remove runner instance from list in Worker Runners */
    destroy(): Promise<void>;
}

export type InjectDestroyerInRunner<T> =
    T extends IRunnerWithDestroyer ?
        Omit<T, 'destroy'> & IRunnerWithDestroyer :
        T & IRunnerWithDestroyer;

export type ResolveRunner<T> = InjectDestroyerInRunner<ResolveRunnerMethods<T>>;
