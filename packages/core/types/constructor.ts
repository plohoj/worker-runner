/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResolvedRunner } from '../runner/resolved-runner';
import { TransferRunnerData } from '../utils/transfer-runner-data';
import { JsonObject, TransferableJsonObject } from './json-object';

// eslint-disable-next-line @typescript-eslint/ban-types
export type Constructor<T extends {} = {}, A extends any[] = any[]> = new (...args: A) => T;
// eslint-disable-next-line @typescript-eslint/ban-types
export type AbstractConstructor<T extends {} = {}, A extends any[] = any[]> = abstract new (...args: A) => T;

export type IRunnerParameter = JsonObject | ResolvedRunner<any> | TransferRunnerData;
export type IRunnerSerializedParameter = ResolvedRunner<any> | TransferableJsonObject;
export type IRunnerMethodResult = JsonObject | ResolvedRunner<any> | TransferRunnerData | void;
export type IRunnerSerializedMethodResult = ResolvedRunner<any> | TransferableJsonObject | void;
export type RunnerConstructor<
    // eslint-disable-next-line @typescript-eslint/ban-types
    T extends {} = {[property: string]: any},
    A extends Array<IRunnerSerializedParameter> = any[]
> = Constructor<T, A>;
