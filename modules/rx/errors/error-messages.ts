import { IRunnerMessageConfig, WORKER_RUNNER_ERROR_MESSAGES } from '@worker-runner/core';

export const RX_WORKER_RUNNER_ERROR_MESSAGES = {
    
    SUBSCRIPTION_NOT_FOUND(config: Readonly<IRunnerMessageConfig> = {}): string {
        return `Subscription of a completed method${WORKER_RUNNER_ERROR_MESSAGES.formatRunnerInfo(config)} not found`;
    },
    SUBSCRIBER_NOT_FOUND(config: Readonly<IRunnerMessageConfig> = {}): string {
        return `The subscriber${WORKER_RUNNER_ERROR_MESSAGES.formatRunnerInfo(config)}`
            + ` was not found after the event was emitted`;
    },
    EMITTED_ERROR(config: Readonly<IRunnerMessageConfig> = {}): string {
        return `Subscription${WORKER_RUNNER_ERROR_MESSAGES.formatRunnerInfo(config)} rejected error`;
    },
};
