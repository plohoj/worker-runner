export interface IRunnerInitErrorMessageConfig {
    runnerName?: string;
}

export interface IRunnerExecuteErrorMessageConfig extends IRunnerInitErrorMessageConfig {
    methodName?: string;
}

export const WORKER_RUNNER_ERROR_MESSAGES = {
    CONSTRUCTOR_NOT_FOUND(config: Readonly<IRunnerInitErrorMessageConfig> = {}) {
        const runnerName = config.runnerName ? `<${config.runnerName}> ` : '';
        return `Runner constructor ${runnerName}not found`;
    },
    RUNNER_WAS_DISCONNECTED(config: Readonly<IRunnerInitErrorMessageConfig> = {}) {
        const runnerName = config.runnerName ? `<${config.runnerName}> ` : '';
        return `The Runner ${runnerName}was destroyed or disconnected`;
    },
    RUNNER_INIT_ERROR(config: Readonly<IRunnerInitErrorMessageConfig> = {}) {
        const runnerName = config.runnerName ? ` <${config.runnerName}>` : '';
        return `An error occurred while initializing Runner${runnerName}`;
    },
    EXECUTE_ERROR(config: Readonly<IRunnerExecuteErrorMessageConfig> = {}) {
        const methodInfo = new Array<string>();
        if (config.runnerName) {
            methodInfo.push(config.runnerName);
        }
        if (config.methodName) {
            methodInfo.push(config.methodName + '(...)');
        }
        let methodInfoString = methodInfo.join('.');
        if (methodInfoString) {
            methodInfoString = ` <${methodInfoString}>`;
        }
        return `Runtime Error ${methodInfoString}`;
    },
    WORKER_NOT_INIT() {
        return 'Worker not init';
    },
    UNEXPECTED_ERROR(config: Readonly<IRunnerInitErrorMessageConfig> = {}) {
        const runnerName = config.runnerName ? ` with <${config.runnerName}>` : '';
        return `Unexpected Error${runnerName}`;
    },

    WORKER_DESTROYED_WITHOUT_CALL() {
        return 'An action was received about the successful destroy,'
        + ' but the destroy method was not previously called';
    },
};
