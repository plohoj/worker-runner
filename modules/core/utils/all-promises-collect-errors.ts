/**
 * @throws {unknown[]}
 */
export async function allPromisesCollectErrors<T>(values: Promise<T>[]): Promise<T[]> {
    const errors = new Array<unknown>();
    const result = await Promise.all(
        values.map(promise => promise
            .catch(error => errors.push(error)),
        ),
    );
    if (errors.length > 0) {
        throw errors;
    }
    return result as T[];
}
