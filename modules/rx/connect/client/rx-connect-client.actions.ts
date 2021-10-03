export enum RxConnectClientAction {
    RX_SUBSCRIBE = 'RX_SUBSCRIBE',
    RX_UNSUBSCRIBE = 'RX_UNSUBSCRIBE',
}

export interface IRxConnectClientSubscribeAction {
    type: RxConnectClientAction.RX_SUBSCRIBE;
    id: number;
}

export interface IRxConnectClientUnsubscribeAction {
    type: RxConnectClientAction.RX_UNSUBSCRIBE;
    id: number;
}

export type IRxConnectClientActions = IRxConnectClientSubscribeAction | IRxConnectClientUnsubscribeAction;
