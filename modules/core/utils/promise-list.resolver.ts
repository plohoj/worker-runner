export interface IPromiseMethods<T = unknown, E = unknown> {
    resolve: (data: T) => void;
    reject: (error: E) => void;
}

export class PromiseListResolver<T, E = unknown> {
    public readonly promises = new Map<number, IPromiseMethods<T,  E>>();

    public promise<R extends T = T>(id: number): Promise<R> {
        return new Promise((resolve, reject) => this.promises.set(
            id,
            {resolve: resolve as (data: T) => void, reject}),
        );
    }

    public resolve<R extends T = T>(id: number, data: R): void {
        const promise$ = this.promises.get(id);
        if (promise$) {
            this.promises.delete(id);
            promise$.resolve(data);
        }
    }

    public reject<R extends E = E>(id: number, error: R): void {
        const promise$ = this.promises.get(id);
        if (promise$) {
            this.promises.delete(id);
            promise$.reject(error);
        }
    }

    public forget(id: number): IPromiseMethods<T,  E> | undefined {
        const promise$ = this.promises.get(id);
        this.promises.delete(id);
        return promise$;
    }
}
