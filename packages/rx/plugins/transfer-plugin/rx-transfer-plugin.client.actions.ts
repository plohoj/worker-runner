export enum RxTransferPluginClientAction {
    RX_SUBSCRIBE = 'RX_SUBSCRIBE',
    RX_UNSUBSCRIBE = 'RX_UNSUBSCRIBE',
}

export interface IRxTransferPluginClientSubscribeAction {
    type: RxTransferPluginClientAction.RX_SUBSCRIBE;
}

export interface IRxTransferPluginClientUnsubscribeAction {
    type: RxTransferPluginClientAction.RX_UNSUBSCRIBE;
}

export type IRxTransferPluginClientActions = IRxTransferPluginClientSubscribeAction | IRxTransferPluginClientUnsubscribeAction;
