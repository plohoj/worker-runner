import { WindowMessageEventConnectionChannel } from '../../connection-channels/window-message-event.connection-channel';
import { IBaseConnectionIdentificationChecker } from '../../connection-identification/checker/base.connection-identification-checker';
import { IMessageEventListenerTarget } from '../../types/targets/message-event-listener-target';
import { IWindowMessageEventTarget } from '../../types/targets/window-message-event-target';
import { BaseMessageEventListenerConnectionHost, IBaseMessageEventListenerConnectionHostConfig } from '../base-message-event-listener/base-message-event-listener.connection-host';
import { IBaseWindowMessageEventConnectionConfig } from './window-message-event-connection-config';

export interface IWindowMessageEventConnectionHostConfig
    extends Omit<IBaseMessageEventListenerConnectionHostConfig<IMessageEventListenerTarget>, 'target'>,
        IBaseWindowMessageEventConnectionConfig {}

export class WindowMessageEventConnectionHost
    extends BaseMessageEventListenerConnectionHost<IMessageEventListenerTarget>
{

    public readonly postMessageTarget: IWindowMessageEventTarget;
    private readonly targetOrigin: string;

    constructor(config: IWindowMessageEventConnectionHostConfig) {
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
