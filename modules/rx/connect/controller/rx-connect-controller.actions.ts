import { IConnectControllerActions, IPossibleConnectControllerActionProperties, BanProperties } from "@worker-runner/core";

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

export type IRxConnectControllerActions =
    | IConnectControllerActions
    | IRxConnectControllerSubscribeAction
    | IRxConnectControllerUnsubscribeAction;

type IRxBannedConnectControllerActionProperties = IRxConnectControllerActions & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: any;
}

export type IRxConnectControllerActionPropertiesRequirements<T> = 
    BanProperties<T, IRxBannedConnectControllerActionProperties> & IPossibleConnectControllerActionProperties;
