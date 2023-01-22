import { WindowMessageEventConnectionChannel } from '../../connection-channels/window-message-event.connection-channel';
import { IBaseConnectionIdentificationChecker } from '../../connection-identification/checker/base.connection-identification-checker';
import { IMessageEventListenerTarget } from '../../types/targets/message-event-listener-target';
import { IWindowMessageEventTarget } from '../../types/targets/window-message-event-target';
import { BaseMessageEventListenerConnectionClient, IBaseMessageEventListenerConnectionClientConfig } from '../base-message-event-listener/base-message-event-listener.connection-client';
import { IBaseWindowMessageEventConnectionConfig } from './window-message-event-connection-config';

export interface IWindowMessageEventConnectionClientConfig
    extends Omit<IBaseMessageEventListenerConnectionClientConfig<IMessageEventListenerTarget>, 'target'>,
        IBaseWindowMessageEventConnectionConfig {}

export class WindowMessageEventConnectionClient
    extends BaseMessageEventListenerConnectionClient<IMessageEventListenerTarget>
{

    public readonly postMessageTarget: IWindowMessageEventTarget;
    public readonly targetOrigin: string;

    constructor(config: IWindowMessageEventConnectionClientConfig) {
        super({
            ...config,
            target: config.eventListenerTarget,
        });
        this.targetOrigin = config.targetOrigin
            ? new URL(config.targetOrigin).origin
            : document.location.origin;
        this.postMessageTarget = config.postMessageTarget;
    }

    protected override buildConnectionChannel(
        identificationChecker?: IBaseConnectionIdentificationChecker,
    ): WindowMessageEventConnectionChannel {
        return new WindowMessageEventConnectionChannel({
            eventListenerTarget: this.target,
            postMessageTarget: this.postMessageTarget,
            targetOrigin: this.targetOrigin,
            identificationChecker,
        });
    }
}
