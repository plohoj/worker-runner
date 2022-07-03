export class PromiseInterrupter {
    /**
     * Throws an exception if the interrupt method is called.
     * The exception is the current instance of {@link PromiseInterrupter}
     */
    public promise!: Promise<void>;
    /**
     * Throws an exception for the {@link promise}.
     * Then creates a new {@link promise} and a {@link interrupt} method
     */
    public interrupt!: () => void;

    constructor() {
        this.buildInterrupter();
    }

    private buildInterrupter(): void {
        this.promise = new Promise<void>((_resolve, reject) => {
            this.interrupt = () => {
                reject(this);
                this.buildInterrupter();
            };
        });
    }
}

