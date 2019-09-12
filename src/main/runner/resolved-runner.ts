type FilterFlags<T, C> = {
    [K in keyof T]: T[K] extends C ? K : never;
};

type AllowedNames<T, C> = FilterFlags<T, C>[keyof T];

type ResolveRunnerPromises<T> = Pick<T, AllowedNames<T, (...any: any[]) => Promise<any>>>;

type WrapMethodsInPromises<T> = {
    [K in keyof T]: T[K] extends (...args: any[])=> any ? (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>> : never
};

type ExcludeMethodWithPromise<T> = Pick<T, Exclude<keyof T, AllowedNames<T, (...any: any[]) => Promise<any>>>>;

type ResolveRunnerMethod<T> = WrapMethodsInPromises<Pick<T, AllowedNames<ExcludeMethodWithPromise<T>, Function>>>;

export type ResolveRunner<T> = ResolveRunnerPromises<T> & ResolveRunnerMethod<T>;
