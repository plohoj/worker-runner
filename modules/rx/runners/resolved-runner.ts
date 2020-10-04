import { JsonObject, RunnerBridge, TransferableJsonObject, TransferRunnerData } from '@worker-runner/core';
import { Observable } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IRxRunnerSerializedParameter = JsonObject | RxResolvedRunner<any> | TransferableJsonObject;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IRxRunnerParameter = JsonObject | RxResolvedRunner<any> | TransferRunnerData;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IRxRunnerMethodResult = JsonObject | RxResolvedRunner<any> | TransferRunnerData | void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IRxRunnerSerializedMethodResult = JsonObject | RxResolvedRunner<any> | TransferableJsonObject | void;

type RxResolvedRunnerArgument<T> = T extends IRxRunnerSerializedParameter
    ? T extends TransferableJsonObject
        ? T extends JsonObject
            ? T
            : TransferRunnerData<T>
        : T
    : never;

export type RxResolvedRunnerArguments<T extends IRxRunnerSerializedParameter[]>
    = { [P in keyof T]: RxResolvedRunnerArgument<T[P]> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RxResolvedRunnerMethod<T extends (...args: any[]) => any, A extends any[] = Parameters<T>> =
    ReturnType<T> extends IRxRunnerMethodResult
        ? ReturnType<T> extends TransferRunnerData<infer TD>
            ? (...args: RxResolvedRunnerArguments<A>) => Promise<TD>
            : (...args: RxResolvedRunnerArguments<A>) => Promise<ReturnType<T>>
        : ReturnType<T> extends Promise<infer PR>
            ? PR extends IRxRunnerMethodResult
                ? PR extends TransferRunnerData<infer TD>
                    ? (...args: RxResolvedRunnerArguments<A>) => Promise<TD>
                    : (...args: RxResolvedRunnerArguments<A>) => ReturnType<T>
                : never
            : ReturnType<T> extends Observable<infer O>
                ? never extends O
                    ? (...args: RxResolvedRunnerArguments<A>) => Promise<ReturnType<T>>
                    : O extends IRxRunnerMethodResult
                        ? O extends TransferRunnerData<infer TD>
                            ? (...args: RxResolvedRunnerArguments<A>) => Promise<Observable<TD>>
                            : (...args: RxResolvedRunnerArguments<A>) => Promise<ReturnType<T>>
                        : never
                : never;

type RxResolvedRunnerMethods<T> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [P in keyof T]: T[P] extends (...args: any[]) => any ? RxResolvedRunnerMethod<T[P]> : never;
};

export type RxResolvedRunner<T> = RxResolvedRunnerMethods<T> & RunnerBridge;

/** @deprecated use ResolvedRunner */
export type RxResolveRunner<T> = RxResolvedRunner<T>;
