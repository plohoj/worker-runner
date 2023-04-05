import { IBaseConnectionIdentificationChecker } from '../connection-identification/checker/base.connection-identification-checker';
import { IAction } from '../types/action';
import { MessageEventHandler } from '../types/message-event-handler';
import { IMessageEventListenerTarget } from '../types/targets/message-event-listener-target';
import { BaseConnectionChannel } from './base.connection-channel';

export interface IBaseMessageEventListenerConnectionChannelConfig<T extends IMessageEventListenerTarget> {
    target: T;
    identificationChecker?: IBaseConnectionIdentificationChecker;
}

export abstract class BaseMessageEventListenerConnectionChannel<
    T extends IMessageEventListenerTarget
> extends BaseConnectionChannel {

    public readonly target: T;
    
    protected readonly identificationChecker?: IBaseConnectionIdentificationChecker;

    private readonly messageHandler: MessageEventHandler<unknown>;

    constructor(config: IBaseMessageEventListenerConnectionChannelConfig<T>) {
        super();
        this.target = config.target;
        this.identificationChecker = config.identificationChecker;
        this.messageHandler = this.buildMessageHandler(config.identificationChecker);
    }

    public override run(): void {
        super.run();
        this.target.addEventListener('message', this.messageHandler);
    }

    protected override afterDestroy(): void {
        this.target.removeEventListener('message', this.messageHandler);
        this.identificationChecker?.destroy();
        super.afterDestroy();
    }

    protected buildMessageHandler(
        identificationChecker?: IBaseConnectionIdentificationChecker
    ): MessageEventHandler<unknown> {
        if (identificationChecker) {
            return (event: MessageEvent<unknown>) => {
                const splitActionCheck = identificationChecker.splitIdentifier(event.data as IAction);
                if (splitActionCheck.isMatched) {
                    this.actionHandler(splitActionCheck.action);
                }
            }
        }
        return (event: MessageEvent<unknown>) => this.actionHandler(event.data as IAction);
    }
}
