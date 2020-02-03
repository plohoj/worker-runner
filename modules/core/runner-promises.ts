export interface IPromiseMethods<T = any, E = any> {
    resolve: (data: T) => void;
    reject: (error: E) => void;
}
export class PromisesResolver<T, E = any> {
    public readonly promises = new Map<number, IPromiseMethods<T,  E>>();

    public promise(id: number): Promise<T> {
        return new Promise((resolve, reject) => this.promises.set(id, {resolve, reject}));
    }

    public resolve(id: number, data: T): void {
        const promise$ = this.promises.get(id);
        if (promise$) {
            this.promises.delete(id);
            promise$.resolve(data);
        }
    }

    public reject(id: number, error: E): void {
        const promise$ = this.promises.get(id);
        if (promise$) {
            this.promises.delete(id);
            promise$.reject(error);
        }
    }
}
