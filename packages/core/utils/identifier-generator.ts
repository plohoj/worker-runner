import { Nominal } from '../types/nominal';

declare const workerRunnerIdentifier: unique symbol;
export type WorkerRunnerIdentifier = Nominal<typeof workerRunnerIdentifier>; 

export class IdentifierGenerator {
    private lastId = 0;

    public generate(): WorkerRunnerIdentifier {
        return this.lastId++ satisfies number as unknown as WorkerRunnerIdentifier;
    }
}
