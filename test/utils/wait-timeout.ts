export function waitTimeout<T extends Promise<any>>(promise: T, timeout: number, min?: number): T {
    const startTime = Date.now();
    return Promise.race([
        promise,
        new Promise((resolve, reject) => setTimeout(() =>
            reject(new Error(`Promise timed out. Expected: ${timeout};`)), timeout)),
    ]).then(response => {
        const stopwatch = Date.now() - startTime;
        if (stopwatch >= timeout) {
            throw new Error(`Promise timed out. Expected: ${timeout}; Actually: ${stopwatch}`);
        }
        if (min && stopwatch < min) {
            fail(new Error(`Promise executed too fast. Expected: ${timeout}; Actually: ${min}`));
        }
        return response;
    }) as T;
}
