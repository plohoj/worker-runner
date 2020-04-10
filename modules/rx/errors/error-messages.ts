import { IRunnerInitErrorMessageConfig } from '@worker-runner/core';

export const RX_WORKER_RUNNER_ERROR_MESSAGES = {
    SUBSCRIPTION_NOT_FOUND(config: Readonly<IRunnerInitErrorMessageConfig> = {}) {
        const runnerName = config.runnerName ? `<${config.runnerName}> ` : '';
        return `Subscription of a completed method ${runnerName}not found`;
    },
    SUBSCRIBER_NOT_FOUND(config: Readonly<IRunnerInitErrorMessageConfig> = {}) {
        const runnerName = config.runnerName ? `<${config.runnerName}> ` : '';
        return `The subscriber ${runnerName}was not found after the event was emitted`;
    },
    EMITTED_ERROR(config: Readonly<IRunnerInitErrorMessageConfig> = {}) {
        const runnerName = config.runnerName ? `<${config.runnerName}> ` : '';
        return `Subscription ${runnerName}rejected error`;
    },
};
