import { ResolveRunner } from '../runner/resolved-runner';
import { JsonObject } from './json-object';

export type Constructor<T extends {} = {}, A extends any[] = any[]> = new (...args: A) => T;
export type IRunnerParameter = JsonObject | ResolveRunner<any>;
export type RunnerConstructor<
    T extends {} = {[property: string]: any},
    A extends Array<IRunnerParameter> = any[]
> = Constructor<T, A>;
