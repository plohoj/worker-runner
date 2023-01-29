import { WorkerRunnerMultipleError } from '../errors/worker-runner-error';
import { ParallelQueueController } from './parallel-queue-controller';

export type MultipleErrorFactory = (errors: unknown[]) => WorkerRunnerMultipleError;
export type ErrorCollectorCompleteFunction = () => void;

export class ErrorCollector {
    public completeQueueController = new ParallelQueueController<void>();
    
    private readonly errors: unknown[] = [];

    constructor(errorFactory: MultipleErrorFactory) {
        this.completeQueueController.eventHandlerController.addHandler(() => {
            if (this.completeQueueController.amount === 0 && this.errors.length > 0) {
                throw errorFactory(this.errors);
            }
        })
    }

    public get hasErrors(): boolean {
        return this.errors.length > 0;
    }

    public addError(error: unknown): void {
        this.errors.push(error);
    }
}
