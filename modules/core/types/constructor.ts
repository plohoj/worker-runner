import { ResolveRunner } from '../runner/resolved-runner';
import { TransferRunnerData } from '../Transferable-runner-data';
import { JsonObject, TransferableJsonObject } from './json-object';

export type Constructor<T extends {} = {}, A extends any[] = any[]> = new (...args: A) => T;
export type IRunnerSerializedParameter = JsonObject | ResolveRunner<any> | TransferableJsonObject;
export type IRunnerParameter = JsonObject | ResolveRunner<any> | TransferRunnerData;
export type IRunnerMethodResult = JsonObject | ResolveRunner<any> | TransferRunnerData | void;
export type IRunnerSerializedMethodResult = JsonObject | ResolveRunner<any> | TransferableJsonObject | void;
export type RunnerConstructor<
    T extends {} = {[property: string]: any},
    A extends Array<IRunnerSerializedParameter> = any[]
> = Constructor<T, A>;
