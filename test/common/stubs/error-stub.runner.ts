
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

    public throwErrorInPromise(errorMessage: string, delay?: number): Promise<any> {
        if (delay) {
            return new Promise((resolve, reject) => setTimeout(() => reject(errorMessage), delay));
        }
        return Promise.reject(errorMessage);
    }

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
