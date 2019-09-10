import { WorkerRunner } from "./worker-runner";

export class RunnerInstance<T extends WorkerRunner> {
    constructor(
        private worker: Worker,
        private runnerId: number,
    ) {

    }
}