import { IRunnerControllerAction, RunnerControllerAction } from '@worker-runner/core';

export enum RxRunnerControllerAction {
    RX_SUBSCRIBE = 100,
    RX_UNSUBSCRIBE,
}

export interface IRxRunnerControllerSubscribeAction {
    type: RxRunnerControllerAction.RX_SUBSCRIBE;
    id: number;
}

export interface IRxRunnerControllerUnsubscribeAction {
    type: RxRunnerControllerAction.RX_UNSUBSCRIBE;
    id: number;
}

export type IRxRunnerControllerAction<T extends RunnerControllerAction | RxRunnerControllerAction
    = RunnerControllerAction | RxRunnerControllerAction>
        = T extends RunnerControllerAction ? IRunnerControllerAction<T>
        : Extract<(IRxRunnerControllerSubscribeAction | IRxRunnerControllerUnsubscribeAction), {type: T}>;
