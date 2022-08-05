import { WorkerRunnerMultipleError } from '../errors/worker-runner-error';

export interface IMapPromisesErrorConfig<I, O> {
    values: Iterable<I> | I[];
    /** Stop converting at the first error and start the process of canceling */
    stopAtFirstError: boolean;
    mapper(value: I): Promise<O> | O;
    errorFactory(errors: unknown[]): WorkerRunnerMultipleError;
    /** Method to canceling successfully mapped data */
    cancelMapped?(result: O): Promise<void> | void;
    /** Method for canceling data that has not yet been mapped */
    cancelRest?(rest: I): Promise<void> | void;
    /** Method for canceling data that threw an error during mapping */
    cancelError?(value: I): Promise<void> | void;
}

/**
 * Converting an iterable list to an array of values.
 * All thrown errors that occur during the conversion will be handled.
 * @throw generated {@link WorkerRunnerMultipleError} in {@link IMapPromisesErrorConfig.errorFactory}
 */
export function collectPromisesErrors<I, O>(config: IMapPromisesErrorConfig<I, O>): Promise<O[]> {
    return new Promise<O[]>((resolve, reject) => {
        const errors = new Array<unknown>();
        const mappedValuesMap = new Map<number, O>();
        let handledValuesLength = 0;
        let allValuesLength = 0;
        let isIterateEnded = false;

        function checkFinal(): void {
            if (isIterateEnded && handledValuesLength >= allValuesLength) {
                if (errors.length > 0) {
                    let multipleError: WorkerRunnerMultipleError;
                    try {
                        multipleError = config.errorFactory(errors);
                    } catch (error) {
                        reject(error);
                        return;
                    }
                    reject(multipleError);
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
                errors.push(error);
            }
            handledValuesLength++;
            checkFinal();
        }

        async function cancelRest(rest: I): Promise<void> {
            try {
                await config.cancelRest?.(rest);
            } catch (error) {
                errors.push(error);
            }
            handledValuesLength++;
            checkFinal();
        }

        async function cancelMapped(mapped: O): Promise<void> {
            try {
                await config.cancelMapped?.(mapped);
            } catch (error) {
                errors.push(error);
            }
            handledValuesLength++;
            checkFinal();
        }

        function onError(): void {
            if (mappedValuesMap.size > 0) {
                handledValuesLength -= mappedValuesMap.size;
                for (const needCancelMappedValue of mappedValuesMap.values()) {
                    cancelMapped(needCancelMappedValue);
                }
                mappedValuesMap.clear();
            }
        }

        function addMapped(index: number, value: O): void {
            if (errors.length > 0) {
                cancelMapped(value);
            } else {
                mappedValuesMap.set(index, value);
                handledValuesLength++;
                checkFinal();
            }
        }

        for (const iteratedValue of config.values) {
            if (errors.length > 0 && config.stopAtFirstError) {
                // TODO NEED TEST About rest exist
                cancelRest(iteratedValue);
            } else {
                let mappedResult: O | Promise<O>; 
                try {
                    mappedResult = config.mapper(iteratedValue);
                } catch (error) {
                    errors.push(error);
                    cancelRest(iteratedValue);
                    onError();
                    continue;
                }
                const index = allValuesLength;
                if (mappedResult instanceof Promise) {
                    // eslint-disable-next-line promise/catch-or-return
                    mappedResult
                        .then(response => addMapped(index, response))
                        .catch(error => {
                            errors.push(error);
                            cancelError(iteratedValue);
                            onError();
                        });
                } else {
                    addMapped(index, mappedResult);
                }
            }
            allValuesLength++;
        }
        isIterateEnded = true;
        checkFinal();
    });
}
