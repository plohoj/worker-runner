export class StorageRunner<T> {

    constructor(private initData: T) {}

    public getStorage(): T {
        return this.initData;
    }
}
