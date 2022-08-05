import { RunnerToken } from "../types/runner-identifier";

export interface IRunnerMessageConfig {
    token?: RunnerToken;
    runnerName?: string;
}

export interface IRunnerExecuteMessageConfig extends IRunnerMessageConfig {
    methodName?: string;
}

export const WORKER_RUNNER_ERROR_MESSAGES = {
    /**
     * @example 
     * <"MyRunnerToken": MyRunner.methodName(...)>
     * <"MyRunnerToken".methodName(...)>
     * <MyRunner.methodName(...)>
     * <methodName(...)>
     * <"MyRunnerToken">
     * <MyRunner>
     */
    formatRunnerInfo(config: Readonly<IRunnerExecuteMessageConfig> = {}, prefix?: string): string {
        let info = '';
        if (config.token) {
            info += `"${config.token}"`;
        }
        if (config.runnerName) {
            info += info ? `: ${config.runnerName}` : config.runnerName;
        }
        if (config.methodName) {
            info += info ? `.${config.methodName}` : `${config.methodName}`;
            info += '(...)';
        }
        if (!info) {
            return '';
        }
        info = `<${info}>`;
        if (prefix) {
            info = prefix + ' ' + info;
        }
        return ' ' + info;
    },

    CONSTRUCTOR_NOT_FOUND(config: Readonly<IRunnerMessageConfig> = {}): string {
        return `Runner constructor${this.formatRunnerInfo(config, 'for')} not found`;
    },
    CONNECTION_WAS_CLOSED(config: Readonly<IRunnerMessageConfig> = {}): string {
        return `Connection${this.formatRunnerInfo(config, 'with')} was closed`;
    },

    RUNNER_INIT_ERROR(config: Readonly<IRunnerMessageConfig> = {}): string {
        return `An error occurred while initializing Runner${this.formatRunnerInfo(config)}`;
    },
    RUNNER_DESTROY_ERROR(config: Readonly<IRunnerMessageConfig> = {}): string {
        return `An error occurred while destroying Runner${this.formatRunnerInfo(config)}`;
    },
    EXECUTE_ERROR(config: Readonly<IRunnerExecuteMessageConfig> = {}): string {
        return `Runtime Error${this.formatRunnerInfo(config, 'for')}`;
    },
    RUNNER_RESOLVER_CLIENT_DESTROY_ERROR(): string {
        return `An error occurred while destroying RunnerResolverClient`;
    },
    RUNNER_RESOLVER_HOST_DESTROY_ERROR(): string {
        return `An error occurred while destroying RunnerResolverHost`;
    },
    RUNNER_RESOLVER_CONNECTION_NOT_ESTABLISHED(): string {
        return 'Connection not established';
    },
    COMMON_CONNECTION_STRATEGY_ERROR(): string {
        return `Common connection strategy for Client and Host not found`;
    },
    DATA_TRANSFER_PREPARATION_ERROR(): string {
        return `An error occurred while preparing data for transfer`;
    },
    DATA_TRANSFER_UNEXPECTED_TYPE_ERROR(): string {
        return `An unexpected data type was received for transfer`;
    },

    UNEXPECTED_ERROR(config: Readonly<IRunnerMessageConfig> = {}): string {
        return `Unexpected Error${this.formatRunnerInfo(config, 'for')}`;
    },
};
