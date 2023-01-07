import { JsonLike, RunnerController, TransferableJsonLike, TransferRunnerData } from '@worker-runner/core';
import { Observable } from 'rxjs';

export type IRxRunnerSerializedParameter
    = JsonLike
    | RxResolvedRunner<unknown>
    | TransferableJsonLike
    | Observable<unknown>;

// TODO TransferRunnerArray and TransferRunnerObject
export type RxResolvedData<T>
    = T extends Observable<infer O>
        ? Observable<RxResolvedData<O>>
        : T extends TransferRunnerData<infer TD>
            ? RxResolvedData<TD>
            : T;

type RxResolvedRunnerArgument<T>
    = T extends IRxRunnerSerializedParameter
        ? T extends Observable<infer O>
            ? Observable<RxResolvedRunnerArgument<O>>
            : T extends TransferableJsonLike
                ? T extends JsonLike
                    ? T
                    : TransferRunnerData<T>
                :T
        : never;

export type RxResolvedRunnerArguments<T extends unknown[]> = { [P in keyof T]: RxResolvedRunnerArgument<T[P]> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RxResolvedRunnerMethod<T extends (...args: any[]) => any>
    = (...args: RxResolvedRunnerArguments<Parameters<T>>) => Promise<RxResolvedData<Awaited<ReturnType<T>>>>;

type RxResolvedRunnerMethods<T> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [P in keyof T]: T[P] extends (...args: any[]) => any
        ? RxResolvedRunnerMethod<T[P]>
        : never;
};

export type RxResolvedRunner<T> = RxResolvedRunnerMethods<T> & RunnerController;
