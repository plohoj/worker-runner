// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { WorkerRunnerMultipleError } from '../errors/worker-runner-error';
import { MultipleErrorFactory } from './parallel.promises';

export interface IRowPromisesErrorConfig {
    errorFactory: MultipleErrorFactory;
}

/**
 * Step-by-step execution of asynchronous methods with collection of errors
 * All thrown errors that occur during the conversion will be handled.
 * @throw generated {@link WorkerRunnerMultipleError} in {@link IRowPromisesErrorConfig.errorFactory}
 */
export async function rowPromisesErrors(
    rows: (() => Promise<unknown> | unknown)[],
    config: IRowPromisesErrorConfig
): Promise<void> {
    const errors: unknown[] = [];
    for (const callback of rows) {
        try {
            await callback();
        } catch (error) {
            errors.push(error);
        }
    }
    if (errors.length > 0) {
        throw config.errorFactory(errors);
    }
}
