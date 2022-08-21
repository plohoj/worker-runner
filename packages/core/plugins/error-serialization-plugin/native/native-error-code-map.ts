import { WorkerRunnerNativeErrorCode } from './native-error-code';

export type INativeCodeToErrorMap = Record<string, typeof Error>;

export const NATIVE_ERROR_CODE_MAP: INativeCodeToErrorMap = {
    [WorkerRunnerNativeErrorCode.TYPE_ERROR]: TypeError,
    [WorkerRunnerNativeErrorCode.SYNTAX_ERROR]: SyntaxError,
    [WorkerRunnerNativeErrorCode.RANGE_ERROR]: RangeError,
    [WorkerRunnerNativeErrorCode.REFERENCE_ERROR]: ReferenceError,
    [WorkerRunnerNativeErrorCode.EVAL_ERROR]: EvalError,
    [WorkerRunnerNativeErrorCode.BASE_NATIVE_ERROR]: Error,
};
