/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResolvedRunner } from '../runner/resolved-runner';
import { TransferRunnerData } from '../transfer-data/transfer-runner-data';
import { JsonLike, TransferableJsonLike } from './json-like';

// eslint-disable-next-line @typescript-eslint/ban-types
export type Constructor<T extends {} = {}, A extends any[] = any[]> = new (...args: A) => T;
// eslint-disable-next-line @typescript-eslint/ban-types
export type AbstractConstructor<T extends {} = {}, A extends any[] = any[]> = abstract new (...args: A) => T;

// TODO Need add TransferRunnerArray and TransferRunnerObject generic typing
export type IRunnerParameter = JsonLike | ResolvedRunner<any> | TransferRunnerData;
export type IRunnerSerializedParameter = ResolvedRunner<any> | TransferableJsonLike;
export type IRunnerMethodResult = JsonLike | ResolvedRunner<any> | TransferRunnerData | void;
export type IRunnerSerializedMethodResult = ResolvedRunner<any> | TransferableJsonLike | void;
export type RunnerConstructor<
    // eslint-disable-next-line @typescript-eslint/ban-types
    T extends {} = {[property: string]: any},
    A extends Array<IRunnerSerializedParameter> = any[]
> = Constructor<T, A>;
// TODO Delete serialized data
