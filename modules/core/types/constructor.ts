import { ResolvedRunner } from '../runner/resolved-runner';
import { TransferRunnerData } from '../utils/transfer-runner-data';
import { JsonObject, TransferableJsonObject } from './json-object';

export type Constructor<T extends {} = {}, A extends any[] = any[]> = new (...args: A) => T;
export type IRunnerSerializedParameter = JsonObject | ResolvedRunner<any> | TransferableJsonObject;
export type IRunnerParameter = JsonObject | ResolvedRunner<any> | TransferRunnerData;
export type IRunnerMethodResult = JsonObject | ResolvedRunner<any> | TransferRunnerData | void;
export type IRunnerSerializedMethodResult = JsonObject | ResolvedRunner<any> | TransferableJsonObject | void;
export type RunnerConstructor<
    T extends {} = {[property: string]: any},
    A extends Array<IRunnerSerializedParameter> = any[]
> = Constructor<T, A>;
