import { INodeAction, NodeAction } from '@core';

export enum RxNodeAction {
    RX_SUBSCRIBE = 100,
    RX_UNSUBSCRIBE,
}

export interface IRxNodeSubscribeAction {
    type: RxNodeAction.RX_SUBSCRIBE;
    actionId: number;
    instanceId: number;
}

export interface IRxNodeUnsubscribeAction {
    type: RxNodeAction.RX_UNSUBSCRIBE;
    actionId: number;
    instanceId: number;
}

export type IRxNodeAction<T extends NodeAction | RxNodeAction = NodeAction | RxNodeAction>
    = T extends NodeAction ? INodeAction<T>
    : Extract<(IRxNodeSubscribeAction | IRxNodeUnsubscribeAction), {type: T}>;
