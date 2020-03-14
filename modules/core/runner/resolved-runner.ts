import { TransferRunnerData } from '../transfer-runner-data';
import { IRunnerMethodResult, IRunnerSerializedParameter } from '../types/constructor';
import { JsonObject, TransferableJsonObject } from '../types/json-object';
import { RunnerBridge } from './runner-bridge';

type ResolvedRunnerArgument<T> = T extends IRunnerSerializedParameter ?
    T extends TransferableJsonObject ?
        T extends JsonObject ?
            T :
            TransferRunnerData<T> :
        T :
    never;

export type ResolvedRunnerArguments<T extends IRunnerSerializedParameter[]>
    = { [P in keyof T]: ResolvedRunnerArgument<T[P]> };

export type ResolvedRunnerMethod<T extends (...args: any[]) => any, A extends any[] = Parameters<T>> =
    ReturnType<T> extends IRunnerMethodResult ?
        ReturnType<T> extends TransferRunnerData<infer TD> ?
            (...args: ResolvedRunnerArguments<A>) => Promise<TD> :
            (...args: ResolvedRunnerArguments<A>) => Promise<ReturnType<T>>:
        ReturnType<T> extends Promise<infer PR> ?
            PR extends IRunnerMethodResult ?
                PR extends TransferRunnerData<infer TD> ?
                    (...args: ResolvedRunnerArguments<A>) => Promise<TD> :
                    (...args: ResolvedRunnerArguments<A>) => ReturnType<T> :
                never :
            never;

type ResolvedRunnerMethods<T> = {
    [P in keyof T]: T[P] extends (...args: any[]) => any ? ResolvedRunnerMethod<T[P]> : never;
};

export type ResolvedRunner<T> = ResolvedRunnerMethods<T> & RunnerBridge;

/** @deprecated use ResolvedRunner */
export type ResolveRunner<T> = ResolvedRunner<T>;
