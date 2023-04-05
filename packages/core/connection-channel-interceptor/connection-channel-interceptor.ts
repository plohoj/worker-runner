import { BaseConnectionChannel } from '../connection-channels/base.connection-channel';
import { IAction } from '../types/action';

export enum ConnectionChannelInterceptorRejectEnum {
    /** The processing call by subsequent interceptors handlers will be interrupted immediately */
    Hard = 'HARD',
    /** The send/receive action will be rejected, but subsequent interceptors handlers calls will not be interrupted */
    Soft = 'SOFT',
}

export interface IConnectionChannelInterceptResult {
    /** Field indicating that the sending/receiving action is rejected */
    rejected?: ConnectionChannelInterceptorRejectEnum;
    /** Original or modified (immutable) Action */
    action?: IAction;
}

export interface IConnectionChannelInterceptResultOptions extends IConnectionChannelInterceptResult {
    /** Original Action */
    initialAction: IAction;
    rejectedBy?: IConnectionChannelInterceptor[];
}

export interface IConnectionChannelInterceptor {
    /** Method of intercepting an action to be sent */
    interceptSend?(action: IAction): IConnectionChannelInterceptResult;
    /**
     * The method is called after all interceptors have processed the sending action
     * or after processing has been interrupted
     */
    interceptSendResult?(options: IConnectionChannelInterceptResultOptions): void;

    /** Method of intercepting an action to be sent */
    interceptReceive?(action: IAction): IConnectionChannelInterceptResult;
    /**
     * The method is called after all interceptors have processed the sending action
     * or after processing has been interrupted
     */
    interceptReceiveResult?(options: IConnectionChannelInterceptResultOptions): void;

    /** Registration of the connection channel for which the interceptor will be used */
    register?(connectionChannel: BaseConnectionChannel): void;

    /**
     * If the method returns the Promise, it means that the interceptor cannot be destroyed right now.
     * And the connection cannot be permanently closed until the method returns the result of the Promise.
     * 
     * If the method is not implemented, it means that the interceptor can be destroyed
     */
    canBeDestroyed?(): true | Promise<true>;

    /**
     * Destroying the Interceptor.
     */
    destroy?(): void;
}
