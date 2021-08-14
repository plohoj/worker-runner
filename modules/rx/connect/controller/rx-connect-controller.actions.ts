export enum RxConnectControllerAction {
    RX_SUBSCRIBE = 'RX_SUBSCRIBE',
    RX_UNSUBSCRIBE = 'RX_UNSUBSCRIBE',
}

export interface IRxConnectControllerSubscribeAction {
    type: RxConnectControllerAction.RX_SUBSCRIBE;
    id: number;
}

export interface IRxConnectControllerUnsubscribeAction {
    type: RxConnectControllerAction.RX_UNSUBSCRIBE;
    id: number;
}

export type IRxConnectControllerActions = IRxConnectControllerSubscribeAction | IRxConnectControllerUnsubscribeAction;
