import { Constructor } from '../types/constructor';
import { IRunnerErrorConfigBase, IRunnerErrorConfigCaptureOpt, WorkerRunnerError } from './worker-runner-error';

export function normalizeError<
    E extends Constructor<WorkerRunnerError, [Pick<IRunnerErrorConfigBase, 'message'>]>,
    C extends ConstructorParameters<E>[0],
>(
    error: unknown,
    alternativeErrorConstructor: E,
    config?: C,
): Error | E {
    if (error instanceof Error) {
        return error;
    }
    const errorConfig = { ...config };
    const errorMessage = error && String(error);
    if (errorMessage) {
        errorConfig.message = errorMessage as string;
    }
    (errorConfig as IRunnerErrorConfigCaptureOpt).captureOpt = normalizeError;
    return new alternativeErrorConstructor(errorConfig);
}
