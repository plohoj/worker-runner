// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { WorkerRunnerMultipleError } from '../errors/worker-runner-error';
import { ErrorCollector } from './error-collector';

export interface IRowPromisesErrorConfig {
    errorCollector: ErrorCollector;
}

/**
 * Step-by-step execution of asynchronous methods with collection of errors
 * All thrown errors that occur during the conversion will be handled.
 * @throw generated {@link WorkerRunnerMultipleError} in {@link IRowPromisesErrorConfig.errorCollector}
 */
export async function rowPromisesErrors(
    rows: (() => Promise<unknown> | unknown)[],
    {errorCollector}: IRowPromisesErrorConfig
): Promise<void> {
    const completeFunction = errorCollector.completeQueueController.reserve();
    for (const callback of rows) {
        try {
            await callback();
        } catch (error) {
            errorCollector.addError(error);
        }
    }
    completeFunction();
}
