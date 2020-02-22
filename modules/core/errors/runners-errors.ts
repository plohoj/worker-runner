export enum RunnerErrorCode {
    RUNNER_INIT_ERROR,
    RUNNER_EXECUTE_ERROR,
    RUNNER_DESTROY_ERROR,
    RUNNER_NOT_INIT,

    WORKER_NOT_INIT,
}

export enum RunnerErrorMessages {
    CONSTRUCTOR_NOT_FOUND = 'Runner constructor not found',
    WORKER_NOT_INIT = 'Worker not init',
    RUNNER_NOT_INIT = 'The Runner not initialized',
}
