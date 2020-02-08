import { IRunnerParameter } from '../types/constructor';
import { JsonObject } from '../types/json-object';

type ResolveRunnerArgument<T>
    = T extends IRunnerParameter ? T : never;

export type ResolveRunnerArguments<T extends IRunnerParameter[]>
    = { [P in keyof T]: ResolveRunnerArgument<T[P]> };

export type ResolveRunnerMethod<T extends (...args: any[]) => any, A extends any[] = Parameters<T>> =
    ReturnType<T> extends JsonObject | void ?
        (...args: ResolveRunnerArguments<A>) => Promise<ReturnType<T>>:
        ReturnType<T> extends Promise<infer R> ?
            R extends JsonObject | void ?
                (...args: ResolveRunnerArguments<A>) => ReturnType<T> :
                never :
            never;

type ResolveRunnerMethods<T> = {
    [P in keyof T]: T[P] extends (...args: any[]) => any ? ResolveRunnerMethod<T[P]> : never;
};

interface IRunnerWithDestroyer {
    /** Remove runner instance from list in Worker Runners */
    destroy(): Promise<void>;
}

export type InjectDestroyerInRunner<T> =
    T extends IRunnerWithDestroyer ?
        Omit<T, 'destroy'> & IRunnerWithDestroyer :
        T & IRunnerWithDestroyer;

export type ResolveRunner<T> = InjectDestroyerInRunner<ResolveRunnerMethods<T>>;
