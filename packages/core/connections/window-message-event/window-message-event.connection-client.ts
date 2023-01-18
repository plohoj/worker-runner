import { WindowMessageEventConnectionChannel } from '../../connection-channels/window-message-event.connection-channel';
import { IBaseConnectionIdentificationChecker } from '../../connection-identification/checker/base.connection-identification-checker';
import { IWindowMessageEventTarget } from '../../types/targets/window-message-event-target';
import { BaseMessageEventListenerConnectionClient, IBaseMessageEventListenerConnectionClientConfig } from '../base-message-event-listener/base-message-event-listener.connection-client';

export interface IWindowMessageEventConnectionClientConfig
    extends IBaseMessageEventListenerConnectionClientConfig<IWindowMessageEventTarget>
{
    /** @default '/' */
    targetOrigin?: string;
}

export class WindowMessageEventConnectionClient
    extends BaseMessageEventListenerConnectionClient<IWindowMessageEventTarget>
{

    private readonly targetOrigin: string;

    constructor(config: IWindowMessageEventConnectionClientConfig) {
        super(config);
        this.targetOrigin = config.targetOrigin || '/';
    }

    public override buildConnectionChannel(
        target: IWindowMessageEventTarget,
        identificationChecker?: IBaseConnectionIdentificationChecker,
    ): WindowMessageEventConnectionChannel {
        return new WindowMessageEventConnectionChannel({
            target,
            targetOrigin: this.targetOrigin,
            identificationChecker,
        });
    }
}
