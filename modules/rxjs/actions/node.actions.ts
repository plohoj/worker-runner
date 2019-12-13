import { INodeAction, NodeAction } from '@core/actions/node.actions';

export enum RxNodeAction {
    RX_SUBSCRIBE = 100,
    RX_UNSUBSCRIBE,
}

export interface INodeRxSubscribeAction {
    type: RxNodeAction.RX_SUBSCRIBE;
    actionId: number;
    instanceId: number;
    runnerId: number;
}

export interface INodeRxUnsubscribeAction {
    type: RxNodeAction.RX_UNSUBSCRIBE;
    actionId: number;
    instanceId: number;
    runnerId: number;
}

export type IRxNodeAction<T extends NodeAction | RxNodeAction = NodeAction | RxNodeAction>
    = T extends NodeAction ? INodeAction<T>
    : Extract<(INodeRxSubscribeAction | INodeRxUnsubscribeAction), {type: T}>;

export function checkActionType<T extends NodeAction | RxNodeAction>(
    action: IRxNodeAction,
    type: T,
): action is IRxNodeAction<T> {
    return action.type === type;
}
