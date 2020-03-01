import { TransferRunnerData } from '../Transferable-runner-data';
import { IRunnerMethodResult, IRunnerSerializedParameter } from '../types/constructor';
import { JsonObject, TransferableJsonObject } from '../types/json-object';
import { RunnerBridge } from './runner-bridge';

type ResolveRunnerArgument<T> = T extends IRunnerSerializedParameter ?
    T extends TransferableJsonObject ?
        T extends JsonObject ?
            T :
            TransferRunnerData<T> :
        T :
    never;

export type ResolveRunnerArguments<T extends IRunnerSerializedParameter[]>
    = { [P in keyof T]: ResolveRunnerArgument<T[P]> };

export type ResolveRunnerMethod<T extends (...args: any[]) => any, A extends any[] = Parameters<T>> =
    ReturnType<T> extends IRunnerMethodResult ?
        ReturnType<T> extends TransferRunnerData<infer TD> ?
            (...args: ResolveRunnerArguments<A>) => Promise<TD> :
            (...args: ResolveRunnerArguments<A>) => Promise<ReturnType<T>>:
        ReturnType<T> extends Promise<infer PR> ?
            PR extends IRunnerMethodResult ?
                PR extends TransferRunnerData<infer TD> ?
                    (...args: ResolveRunnerArguments<A>) => Promise<TD> :
                    (...args: ResolveRunnerArguments<A>) => ReturnType<T> :
                never :
            never;

type ResolveRunnerMethods<T> = {
    [P in keyof T]: T[P] extends (...args: any[]) => any ? ResolveRunnerMethod<T[P]> : never;
};

export type ResolveRunner<T> = ResolveRunnerMethods<T> & RunnerBridge;
