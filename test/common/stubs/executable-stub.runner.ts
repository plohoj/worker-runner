import { JsonLike } from '@worker-runner/core';

export const EXECUTABLE_STUB_RUNNER_TOKEN = 'ExecutableStubRunnerToken';

export class ExecutableStubRunner<T extends JsonLike = JsonLike> {

    constructor(private stage?: T) {}

    public getStage(): T | undefined {
        return this.stage;
    }

    public amount(x: number, y: number): number {
        return x + y;
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async amountAsync(x: number, y: number): Promise<number> {
        return this.amount(x, y);
    }

    public delay(duration: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    public destroy(): void {
        // stub
    }
}
