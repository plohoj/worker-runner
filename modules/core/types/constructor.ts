import { JsonObject } from './json-object';

export type Constructor<T extends {} = {}, A extends any[] = any[]> = new (...args: A) => T;
export type RunnerConstructor<T extends {} = {[property: string]: any}, A extends JsonObject[] = JsonObject[]>
    = Constructor<T, A>;
