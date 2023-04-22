import { ConnectionChannelInterceptorRejectEnum, IConnectionChannelInterceptor, IConnectionChannelInterceptResult } from '../../../connection-channel-interceptor/connection-channel-interceptor';
import { IAction } from '../../../types/action';
import { DirectionConnectionIdentifierField, IDirectionConnectionIdentifierFields } from './direction-connection-identifier-fields';

export interface IDirectionConnectionIdentificationCheckerConfig {
    from: DirectionConnectionIdentifierField;
    to: DirectionConnectionIdentifierField;
}

export class DirectionConnectionChannelInterceptor implements IConnectionChannelInterceptor {
    public readonly to: DirectionConnectionIdentifierField;
    public readonly from: DirectionConnectionIdentifierField;

    constructor(config: IDirectionConnectionIdentificationCheckerConfig) {
        this.from = config.from;
        this.to = config.to;
    }

    public interceptSend(action: IAction): IConnectionChannelInterceptResult {
        return {
            action: {
                ...action,
                from: this.from,
            }  as IAction & IDirectionConnectionIdentifierFields
        }
    }

    public interceptReceive(action: IAction): IConnectionChannelInterceptResult {
        const {from, ...originalAction} = (action as IAction & IDirectionConnectionIdentifierFields);
        return {
            action: originalAction,
            rejected: from === this.to ? undefined : ConnectionChannelInterceptorRejectEnum.Hard,
        };
    }
}
