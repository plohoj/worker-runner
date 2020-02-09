import { IRunnerParameter } from '../types/constructor';
import { JsonObject } from '../types/json-object';
import { RunnerBridge } from './runner-bridge';

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

export type ResolveRunner<T> = ResolveRunnerMethods<T> & RunnerBridge;
