export interface IRunnerInitErrorMessageConfig {
    runnerName?: string;
}

export interface IRunnerExecuteErrorMessageConfig extends IRunnerInitErrorMessageConfig {
    methodName?: string;
}

export const WORKER_RUNNER_ERROR_MESSAGES = {
    CONSTRUCTOR_NOT_FOUND(config: Readonly<IRunnerInitErrorMessageConfig> = {}): string {
        const runnerName = config.runnerName ? `<${config.runnerName}> ` : '';
        return `Runner constructor ${runnerName}not found`;
    },
    CONNECTION_WAS_CLOSED(config: Readonly<IRunnerInitErrorMessageConfig> = {}): string {
        const runnerName = config.runnerName ? `with <${config.runnerName}> ` : '';
        return `Connection ${runnerName}was closed`;
    },

    RUNNER_INIT_ERROR(config: Readonly<IRunnerInitErrorMessageConfig> = {}): string {
        const runnerName = config.runnerName ? ` <${config.runnerName}>` : '';
        return `An error occurred while initializing Runner${runnerName}`;
    },
    RUNNER_DESTROY_ERROR(config: Readonly<IRunnerInitErrorMessageConfig> = {}): string {
        const runnerName = config.runnerName ? ` <${config.runnerName}>` : '';
        return `An error occurred while destroying Runner${runnerName}`;
    },
    EXECUTE_ERROR(config: Readonly<IRunnerExecuteErrorMessageConfig> = {}): string {
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
    WORKER_DESTROY_ERROR(config: Readonly<IRunnerInitErrorMessageConfig> = {}): string {
        const runnerName = config.runnerName ? ` <${config.runnerName}>` : '';
        return `An error occurred while destroying Runner${runnerName}`;
    },
    WORKER_NOT_INIT(): string {
        return 'Worker not init';
    },

    UNEXPECTED_ERROR(config: Readonly<IRunnerInitErrorMessageConfig> = {}): string {
        const runnerName = config.runnerName ? ` with <${config.runnerName}>` : '';
        return `Unexpected Error${runnerName}`;
    },
};
