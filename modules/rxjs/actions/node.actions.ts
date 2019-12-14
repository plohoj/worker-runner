import { INodeAction, NodeAction } from '@core/actions/node.actions';

export enum RxNodeAction {
    RX_SUBSCRIBE = 100,
    RX_UNSUBSCRIBE,
}

export interface INodeRxSubscribeAction {
    type: RxNodeAction.RX_SUBSCRIBE;
    actionId: number;
    instanceId: number;
}

export interface INodeRxUnsubscribeAction {
    type: RxNodeAction.RX_UNSUBSCRIBE;
    actionId: number;
    instanceId: number;
}

export type INodeRxAction<T extends NodeAction | RxNodeAction = NodeAction | RxNodeAction>
    = T extends NodeAction ? INodeAction<T>
    : Extract<(INodeRxSubscribeAction | INodeRxUnsubscribeAction), {type: T}>;

export function checkRxActionType<T extends NodeAction | RxNodeAction>(
    action: INodeRxAction,
    type: T,
): action is INodeRxAction<T> {
    return action.type === type;
}
