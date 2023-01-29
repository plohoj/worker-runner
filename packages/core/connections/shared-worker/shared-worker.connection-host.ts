import { IBaseConnectionIdentificationStrategyHost } from '../../connection-identification/strategy/base/base.connection-identification-strategy.host';
import { ConnectionIdentificationStrategyComposerHost } from '../../connection-identification/strategy/composer/connection-identification-strategy.composer.host';
import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { IPortConnectEventListenerTarget } from '../../types/targets/port-connect-event-listener-target';
import { IBaseMessageEventListenerConnectionHostConfig } from '../base-message-event-listener/base-message-event-listener.connection-host';
import { ConnectionHostHandler, IBaseConnectionHost } from '../base/base.connection-host';
import { MessageEventConnectionHost } from '../message-event/message-event.connection-host';

export interface ISharedWorkerConnectionHostConfig
    extends Omit<IBaseMessageEventListenerConnectionHostConfig<never>, 'target'>
{
    target: IPortConnectEventListenerTarget;
}

// TODO Need a PING PONG check that the connection is still stable and the tab has not been closed
export class SharedWorkerConnectionHost implements IBaseConnectionHost {
    public readonly target: IPortConnectEventListenerTarget;
    private readonly connectionStrategies: BaseConnectionStrategyHost[];
    private readonly identificationStrategies: IBaseConnectionIdentificationStrategyHost[];
    private readonly connections: MessageEventConnectionHost[] = [];
    private handler!: ConnectionHostHandler;

    constructor(config: ISharedWorkerConnectionHostConfig) {
        this.target = config.target;
        this.connectionStrategies = config.connectionStrategies;
        const identificationStrategies = config.identificationStrategies || [];
        this.identificationStrategies = identificationStrategies.length > 1
            ? [new ConnectionIdentificationStrategyComposerHost({ identificationStrategies })]
            : identificationStrategies
    }

    public startListen(handler: ConnectionHostHandler): void {
        this.handler = handler;
        this.target.addEventListener('connect', this.newPortConnection);
    }

    public stop(): void | Promise<void> {
        this.target.removeEventListener('connect', this.newPortConnection);
        for (const connection of this.connections) {
            connection.stop();
        }
        this.connections.splice(0);
    }

    private newPortConnection = (event: MessageEvent<unknown>) => {
        const port = event.ports[0];
        const connection = new MessageEventConnectionHost({
            target: port,
            connectionStrategies: this.connectionStrategies,
            identificationStrategies: this.identificationStrategies,
        });
        this.connections.push(connection);
        connection.startListen(this.handler);
        port.start();
    }
}
