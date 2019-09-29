export class RunnerWidthException {
    public throwException(errorMessage: string): void {
        throw errorMessage;
    }

    public throwExceptionWidthDelay(errorMessage: string, delayDuration: number): Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(() => reject(errorMessage) ,delayDuration);
        })
    }

    public destroy(): void {
        throw new Error('DESTROY_EXCEPTION');
    }
}