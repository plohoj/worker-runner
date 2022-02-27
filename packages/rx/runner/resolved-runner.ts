import { JsonLike, RunnerController, TransferableJsonLike, TransferRunnerData } from '@worker-runner/core';
import { Observable } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IRxRunnerSerializedParameter = JsonLike | RxResolvedRunner<any> | TransferableJsonLike;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IRxRunnerParameter = JsonLike | RxResolvedRunner<any> | TransferRunnerData;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IRxRunnerMethodResult = JsonLike | RxResolvedRunner<any> | TransferRunnerData | void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IRxRunnerSerializedMethodResult = JsonLike | RxResolvedRunner<any> | TransferableJsonLike | void;

type RxResolvedRunnerArgument<T> = T extends IRxRunnerSerializedParameter
    ? T extends TransferableJsonLike
        ? T extends JsonLike
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

export type RxResolvedRunner<T> = RxResolvedRunnerMethods<T> & RunnerController;
