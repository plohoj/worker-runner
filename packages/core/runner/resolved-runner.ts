import { IRunnerMethodResult, IRunnerSerializedParameter } from '../types/constructor';
import { JsonLike, TransferableJsonLike } from '../types/json-like';
import { TransferRunnerData } from '../transfer-data/transfer-runner-data';
import { RunnerController } from './runner.controller';

type ResolvedRunnerArgument<T> = T extends IRunnerSerializedParameter
    ? T extends TransferableJsonLike
        ? T extends JsonLike
            ? T
            : TransferRunnerData<T>
        :T
    : never;

export type ResolvedRunnerArguments<T extends ArrayLike<IRunnerSerializedParameter>>
    = { [P in keyof T]: ResolvedRunnerArgument<T[P]> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResolvedRunnerMethod<T extends (...args: any[]) => any, A extends any[] = Parameters<T>> =
    ReturnType<T> extends IRunnerMethodResult
        ? ReturnType<T> extends TransferRunnerData<infer TD>
            ? (...args: ResolvedRunnerArguments<A>) => Promise<TD>
            : (...args: ResolvedRunnerArguments<A>) => Promise<ReturnType<T>>
        : ReturnType<T> extends Promise<infer PR>
            ? PR extends IRunnerMethodResult
                ? PR extends TransferRunnerData<infer TD>
                    ? (...args: ResolvedRunnerArguments<A>) => Promise<TD>
                    : (...args: ResolvedRunnerArguments<A>) => ReturnType<T>
                :never
            : never;

type ResolvedRunnerMethods<T> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [P in keyof T]: T[P] extends (...args: any[]) => any ? ResolvedRunnerMethod<T[P]> : never;
};

// TODO It may be worth allowing any type of argument and return type,
// so that plugins can handle any type of transmitted data.
// Then how to convert the type?
export type ResolvedRunner<T> = ResolvedRunnerMethods<T> & RunnerController;
