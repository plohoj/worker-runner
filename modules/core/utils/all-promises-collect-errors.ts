type IPromisedValuesOrErrors<T> = {
    values: T[];
} | {
    errors: unknown[];
}

/**
 * @throws {unknown[]}
 */
export async function allPromisesCollectErrors<T>(promises: Promise<T>[]): Promise<IPromisedValuesOrErrors<T>> {
    const errors = new Array<unknown>();
    const values = await Promise.all(
        promises.map(promise => promise
            .catch(error => errors.push(error)),
        ),
    );
    if (errors.length > 0) {
        return { errors };
    }
    return { values } as IPromisedValuesOrErrors<T>;
}

type IPromisedMappedValuesWithPossibleErrors<I, O> = {
    mapped: O[],
    errors: unknown[],
    rest: I[],
};

export function mapPromisesAndAwaitMappedWhenError<I, O>(
    values: I[],
    mapper: (value: I) => Promise<O>,
): Promise<IPromisedMappedValuesWithPossibleErrors<I, O>> {
    return new Promise<IPromisedMappedValuesWithPossibleErrors<I, O>>((resolve) => {
        const result: IPromisedMappedValuesWithPossibleErrors<I, O> = {
            mapped: [],
            errors: [],
            rest: [],
        }
        if (values.length === 0) {
            resolve(result);
            return;
        }
        const mappedValuesMap = new Map<number, O>();
        let mappedValuesLength = 0;
        function checkFinal(): void {
            if (mappedValuesLength >= values.length) {
                const sortedKeys = [...mappedValuesMap.keys()].sort((first, second) => first - second);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                result.mapped = sortedKeys.map(key => mappedValuesMap.get(key)!);
                resolve(result);
            }
        }

        for (const [index, value] of values.entries()) {
            if (result.errors.length > 0) {
                // TODO NEED TEST About rest exist
                result.rest.push(value);
                mappedValuesLength++;
                checkFinal();
            } else {
                // eslint-disable-next-line promise/catch-or-return
                mapper(value)
                    .then(response => mappedValuesMap.set(index, response))
                    .catch(error => result.errors.push(error))
                    .finally(() => {
                        mappedValuesLength++;
                        checkFinal();
                    });
            }
        }
    })
}
