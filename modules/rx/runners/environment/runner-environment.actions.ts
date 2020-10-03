import { TransferableJsonObject } from '@worker-runner/core';

export enum RxRunnerEnvironmentAction {
    RX_EMIT = 'RX_EMIT',
    RX_EMIT_RUNNER_RESULT = 'RX_EMIT_RUNNER_RESULT',
}

export interface IRxRunnerEnvironmentEmitAction {
    type: RxRunnerEnvironmentAction.RX_EMIT;
    response: TransferableJsonObject;
    transfer?: Transferable[]
}

export interface IRxRunnerEnvironmentEmitRunnerResultAction {
    type: RxRunnerEnvironmentAction.RX_EMIT_RUNNER_RESULT;
    runnerId: number,
    port: MessagePort;
    transfer: [MessagePort]
}

export type IRxRunnerEnvironmentAction = 
        | IRxRunnerEnvironmentEmitAction
        | IRxRunnerEnvironmentEmitRunnerResultAction;
