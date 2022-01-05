import { TransferableJsonObject, RunnerToken } from '@worker-runner/core';

export enum RxRunnerEnvironmentHostAction {
    RX_EMIT = 'RX_EMIT',
    RX_EMIT_RUNNER_RESULT = 'RX_EMIT_RUNNER_RESULT',
}

export interface IRxRunnerEnvironmentHostEmitAction {
    type: RxRunnerEnvironmentHostAction.RX_EMIT;
    response: TransferableJsonObject;
    transfer?: Transferable[]
}

export interface IRxRunnerEnvironmentHostEmitRunnerResultAction {
    type: RxRunnerEnvironmentHostAction.RX_EMIT_RUNNER_RESULT;
    token: RunnerToken,
    port: MessagePort;
    transfer: [MessagePort]
}

export type IRxRunnerEnvironmentHostAction = 
        | IRxRunnerEnvironmentHostEmitAction
        | IRxRunnerEnvironmentHostEmitRunnerResultAction;
