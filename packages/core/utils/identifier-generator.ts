// TODO Find a better way to define a unique type
export type WorkerRunnerIdentifier = 'FAKE_TYPE_FOR_WORKER_RUNNER_IDENTIFIER' | symbol; 

export class IdentifierGenerator {
    private lastId = 0;

    public generate(): WorkerRunnerIdentifier {
        return this.lastId++ as unknown as WorkerRunnerIdentifier;
    }
}
