import { JsonObject, RunnerBridge, TransferableJsonObject, TransferRunnerData } from '@worker-runner/core';
import { Observable } from 'rxjs';

export type IRxRunnerSerializedParameter = JsonObject | RxResolveRunner<any> | TransferableJsonObject;
export type IRxRunnerParameter = JsonObject | RxResolveRunner<any> | TransferRunnerData;
export type IRxRunnerMethodResult = JsonObject | RxResolveRunner<any> | TransferRunnerData | void;
export type IRxRunnerSerializedMethodResult = JsonObject | RxResolveRunner<any> | TransferableJsonObject | void;

type RxResolveRunnerArgument<T> = T extends IRxRunnerSerializedParameter ?
    T extends TransferableJsonObject ?
        T extends JsonObject ?
            T :
            TransferRunnerData<T> :
        T :
        never;

export type RxResolveRunnerArguments<T extends IRxRunnerSerializedParameter[]>
    = { [P in keyof T]: RxResolveRunnerArgument<T[P]> };

export type RxResolveRunnerMethod<T extends (...args: any[]) => any, A extends any[] = Parameters<T>> =
    ReturnType<T> extends IRxRunnerMethodResult ?
        ReturnType<T> extends TransferRunnerData<infer TD> ?
            (...args: RxResolveRunnerArguments<A>) => Promise<TD> :
            (...args: RxResolveRunnerArguments<A>) => Promise<ReturnType<T>>:
        ReturnType<T> extends Promise<infer PR> ?
            PR extends IRxRunnerMethodResult ?
                PR extends TransferRunnerData<infer TD> ?
                    (...args: RxResolveRunnerArguments<A>) => Promise<TD> :
                    (...args: RxResolveRunnerArguments<A>) => ReturnType<T> :
                never :
            ReturnType<T> extends Observable<infer O> ?
                O extends IRxRunnerMethodResult ?
                    O extends TransferRunnerData<infer TD> ?
                        (...args: RxResolveRunnerArguments<A>) => Promise<Observable<TD>> :
                        (...args: RxResolveRunnerArguments<A>) => Promise<ReturnType<T>> :
                    never :
                never;

type RxResolveRunnerMethods<T> = {
    [P in keyof T]: T[P] extends (...args: any[]) => any ? RxResolveRunnerMethod<T[P]> : never;
};

export type RxResolveRunner<T> = RxResolveRunnerMethods<T> & RunnerBridge;
