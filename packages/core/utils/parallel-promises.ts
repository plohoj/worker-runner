import { ErrorCollector } from './error-collector';
import { HalfPromisedIterator, HALF_PROMISED_ITERATOR_DONE } from './half-promised-iterator';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { WorkerRunnerMultipleError } from '../errors/worker-runner-error';

// TODO Implement a fake promise that will call the callback immediately when there is no need to wait

export interface IParallelPromisesConfig<I, O> {
    values: Iterable<I> | HalfPromisedIterator<I>;
    /** Stop converting at the first error and start the process of canceling */
    stopAtFirstError: boolean;
    errorCollector: ErrorCollector;
    mapper(value: I): Promise<O> | O;
    /** Method to canceling successfully mapped data */
    cancelMapped?(result: O): Promise<void> | void;
    /** Method for canceling data that has not yet been mapped */
    cancelRest?(rest: I): Promise<void> | void;
    /** Method for canceling data that threw an error during mapping */
    cancelError?(value: I): Promise<void> | void;
}

/**
 * Executes all promises in parallel and collects errors that occurred during execution
 * All thrown errors that occur during the conversion will be handled.
 * @throw generated {@link WorkerRunnerMultipleError} in {@link IParallelPromisesConfig.errorCollector}
 */
export function parallelPromises<I, O>({
    errorCollector,
    values,
    ...config
}: IParallelPromisesConfig<I, O>): Promise<O[]> {
    return new Promise<O[]>((resolve, reject) => {
        const completeFunction = errorCollector.completeQueueController.reserve();
        const mappedValuesMap = new Map<number, O>();
        let handledValuesLength = 0;
        let allValuesLength = 0;
        let isIterateEnded = false;

        function checkFinal(): void {
            if (isIterateEnded && handledValuesLength >= allValuesLength) {
                try {
                    completeFunction();
                } catch (error) {
                    reject(error);
                    return;
                }
                const sortedKeys = [...mappedValuesMap.keys()].sort((first, second) => first - second);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const mappedResult = sortedKeys.map(key => mappedValuesMap.get(key)!);
                resolve(mappedResult);
            }
        }

        async function cancelError(rest: I): Promise<void> {
            try {
                await config.cancelError?.(rest);
            } catch (error) {
                errorCollector.addError(error);
            }
            handledValuesLength++;
            checkFinal();
        }

        async function cancelRest(rest: I): Promise<void> {
            try {
                await config.cancelRest?.(rest);
            } catch (error) {
                errorCollector.addError(error);
            }
            handledValuesLength++;
            checkFinal();
        }

        async function cancelMapped(mapped: O): Promise<void> {
            try {
                await config.cancelMapped?.(mapped);
            } catch (error) {
                errorCollector.addError(error);
            }
            handledValuesLength++;
            checkFinal();
        }

        function onError(): void {
            if (mappedValuesMap.size > 0) {
                handledValuesLength -= mappedValuesMap.size;
                for (const needCancelMappedValue of mappedValuesMap.values()) {
                    void cancelMapped(needCancelMappedValue);
                }
                mappedValuesMap.clear();
            }
        }

        function addMapped(index: number, value: O): void {
            if (errorCollector.hasErrors) {
                void cancelMapped(value);
            } else {
                mappedValuesMap.set(index, value);
                handledValuesLength++;
                checkFinal();
            }
        }

        function handleValue(value: I): void {
            if (errorCollector.hasErrors && config.stopAtFirstError) {
                // TODO NEED TEST About rest exist
                void cancelRest(value);
            } else {
                let mappedResult: O | Promise<O>; 
                try {
                    mappedResult = config.mapper(value);
                } catch (error) {
                    errorCollector.addError(error);
                    void cancelRest(value);
                    onError();
                    return;
                }
                const index = allValuesLength;
                if (mappedResult instanceof Promise) {
                    mappedResult
                        .then(response => addMapped(index, response))
                        .catch(error => {
                            errorCollector.addError(error);
                            void cancelError(value);
                            onError();
                        });
                } else {
                    addMapped(index, mappedResult);
                }
            }
            allValuesLength++;
        }

        function afterIterate(): void {
            isIterateEnded = true;
            checkFinal();
        }

        async function iterateAsync(halfPromisedIterator: HalfPromisedIterator<I>): Promise<void> {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const iterateValue = await halfPromisedIterator();
                if (iterateValue === HALF_PROMISED_ITERATOR_DONE) {
                    break;
                }
                handleValue(iterateValue as I);
            }
            afterIterate();
        }

        function iterateSync(values: Iterable<I>) {
            for (const iteratedValue of values) {
                handleValue(iteratedValue);
            }
            afterIterate();
        }

        if (typeof values === 'function') {
            void iterateAsync(values);
        } else {
            iterateSync(values);
        }
    });
}
