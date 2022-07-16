export class PromiseInterrupter {
    /**
     * Emit itself if the {@link interrupt} method is called.
     */
    public promise!: Promise<this>;
    /**
     * Emit itself for the {@link promise}.
     * Then creates a new {@link promise} and a {@link interrupt} method
     */
    public interrupt!: () => void;

    constructor() {
        this.buildInterrupter();
    }

    private buildInterrupter(): void {
        this.promise = new Promise((resolve) => {
            this.interrupt = () => {
                resolve(this);
                this.buildInterrupter();
            };
        });
    }
}

