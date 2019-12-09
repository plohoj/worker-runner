type FilterFlags<T, C> = {
    [P in keyof T]: T[P] extends C ? P : never;
};

type AllowedNames<T, C> = FilterFlags<T, C>[keyof T];

type ResolveRunnerPromises<T> = Pick<T, AllowedNames<T, (...any: any[]) => Promise<any>>>;

type WrapMethodsInPromises<T> = {
    [K in keyof T]: T[K] extends (...args: any[])=> any ? (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>> : never
};

type ExcludeMethodWithPromise<T> = Pick<T, Exclude<keyof T, AllowedNames<T, (...any: any[]) => Promise<any>>>>;

type ResolveRunnerMethod<T> = WrapMethodsInPromises<Pick<T, AllowedNames<ExcludeMethodWithPromise<T>, Function>>>;

interface RunnerWithDestroyer {
    /** Remove runner instance from list in Worker Runners */
    destroy(): Promise<void>
};

type SerializeRunnerDestroyer<T> = 
    T extends RunnerWithDestroyer
        ? (Parameters<T['destroy']> extends never[]
            ? T
            : Omit<T, 'destroy'> & RunnerWithDestroyer )
        : T & RunnerWithDestroyer;

export type ResolveRunner<T> = SerializeRunnerDestroyer<ResolveRunnerPromises<T> & ResolveRunnerMethod<T>>;
