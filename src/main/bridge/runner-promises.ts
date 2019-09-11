
export class RunnerPromises<T> {
    private promises = new Map<number, {resolve: (data: T) => void, reject: Function}>();

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

    public reject(id: number, error: any): void {
        const promise$ = this.promises.get(id);
        if (promise$) {
            this.promises.delete(id);
            promise$.reject(error);
        }
    }
}