export enum RunnerErrorCode {
    RUNNER_INIT_CONSTRUCTOR_ERROR,
    RUNNER_INIT_CONSTRUCTOR_NOT_FOUND,

    RUNNER_EXECUTE_ERROR,
    RUNNER_EXECUTE_INSTANCE_NOT_FOUND,

    RUNNER_DESTROY_ERROR,
    RUNNER_DESTROY_INSTANCE_NOT_FOUND,

    RUNNER_WAS_DESTROYED,
}

export enum RunnerErrorMessages {
    CONSTRUCTOR_NOT_FOUND = 'Runner constructor not found',
    INSTANCE_NOT_FOUND = 'Runner instance not found',
    WORKER_BRIDGE_NOT_INIT = 'Worker bridge not init',
    RUNNER_WAS_DESTROYED = 'The runner was destroyed',
}
