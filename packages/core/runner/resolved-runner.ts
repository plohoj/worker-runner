import { TransferRunnerData } from '../transfer-data/transfer-runner-data';
import { IRunnerSerializedParameter } from '../types/constructor';
import { JsonLike, TransferableJsonLike } from '../types/json-like';
import { RunnerController } from './runner.controller';

// TODO TransferRunnerArray and TransferRunnerObject
export type ResolvedData<T>
    =  T extends TransferRunnerData<infer TD>
        ? ResolvedData<TD>
        : T;

type ResolvedRunnerArgument<T> = T extends IRunnerSerializedParameter
    ? T extends TransferableJsonLike
        ? T extends JsonLike
            ? T
            : TransferRunnerData<T>
        :T
    : never;

export type ResolvedRunnerArguments<T extends unknown[]> = { [P in keyof T]: ResolvedRunnerArgument<T[P]> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResolvedRunnerMethod<T extends (...args: any[]) => any>
    = (...args: ResolvedRunnerArguments<Parameters<T>>) => Promise<ResolvedData<Awaited<ReturnType<T>>>>;

type ResolvedRunnerMethods<T> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [P in keyof T]: T[P] extends (...args: any[]) => any
        ? ResolvedRunnerMethod<T[P]>
        : never;
};

// TODO It may be worth allowing any type of argument and return type,
// so that plugins can handle any type of transmitted data.
// Then how to convert the type?
export type ResolvedRunner<T> = ResolvedRunnerMethods<T> & RunnerController;
