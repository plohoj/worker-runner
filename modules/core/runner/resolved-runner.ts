import { ClearNever } from '@core/types/allowed-names';
import { JsonObject } from '@core/types/json-object';

export type SerializeRunnerMethod<T extends (...args: any) => any > =
    ReturnType<T> extends Promise<JsonObject | void>    ? T :
    ReturnType<T> extends JsonObject | void             ? (...args: Parameters<T>) => Promise<ReturnType<T>>:
    never;

type IterateRunnerMethods<T> = {
    [P in keyof T]: T[P] extends (...args: any) => any ? SerializeRunnerMethod<T[P]> : never;
};

interface RunnerWithDestroyer {
    /** Remove runner instance from list in Worker Runners */
    destroy(): Promise<void>;
}

export type SerializeRunnerDestroyer<T> =
    T extends RunnerWithDestroyer
        ? (Parameters<T['destroy']> extends never[]
            ? T
            : Omit<T, 'destroy'> & RunnerWithDestroyer )
        : T & RunnerWithDestroyer;

export type ResolveRunner<T> = SerializeRunnerDestroyer<ClearNever<IterateRunnerMethods<T>>>;
