import { WindowMessageEventConnectionChannel } from '../../connection-channels/window-message-event.connection-channel';
import { IBaseConnectionIdentificationChecker } from '../../connection-identification/checker/base.connection-identification-checker';
import { IWindowMessageEventTarget } from '../../types/targets/window-message-event-target';
import { BaseMessageEventListenerConnectionHost, IBaseMessageEventListenerConnectionHostConfig } from '../base-message-event-listener/base-message-event-listener.connection-host';

export interface IWindowMessageEventConnectionHostConfig
    extends IBaseMessageEventListenerConnectionHostConfig<IWindowMessageEventTarget>
{
    /** @default '/' */
    targetOrigin?: string;
}

export class WindowMessageEventConnectionHost
    extends BaseMessageEventListenerConnectionHost<IWindowMessageEventTarget>
{

    private readonly targetOrigin: string;

    constructor(config: IWindowMessageEventConnectionHostConfig) {
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
