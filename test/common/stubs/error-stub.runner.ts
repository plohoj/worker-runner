
export class ErrorStubRunner {
    constructor(errorMessage?: string) {
        if (errorMessage) {
            throw errorMessage;
        }
    }

    public throwError(errorMessage: string): void {
        throw errorMessage;
    }

    public throwErrorTrace(errorMessage: string): void {
        throw new Error(errorMessage);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public throwErrorInPromise(errorMessage: string, delay?: number): Promise<any> {
        if (delay) {
            return new Promise((resolve, reject) => setTimeout(() => reject(errorMessage), delay));
        }
        return Promise.reject(errorMessage);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public throwErrorTraceInPromise(errorMessage: string, delay?: number): Promise<any> {
        if (delay) {
            return new Promise((resolve, reject) => setTimeout(() => reject(new Error(errorMessage)), delay));
        }
        return Promise.reject(new Error(errorMessage));
    }

    public destroy(): void {
        throw new Error('DESTROY_EXCEPTION');
    }
}
