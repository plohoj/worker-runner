import { BaseConnectionStrategyHost } from '../../connection-strategies/base/base.connection-strategy-host';
import { IInterceptPlugin } from '../../plugins/intercept-plugin/intercept.plugin';
import { IPortConnectEventListenerTarget } from '../../types/targets/port-connect-event-listener-target';
import { ConnectionHostHandler, IBaseConnectionHost } from '../base/base.connection-host';
import { IBaseMessageEventListenerConnectionHostConfig } from '../base-message-event-listener/base-message-event-listener.connection-host';
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
    private readonly interceptPlugins: IInterceptPlugin[];
    private readonly connections: MessageEventConnectionHost[] = [];
    private handler!: ConnectionHostHandler;

    constructor(config: ISharedWorkerConnectionHostConfig) {
        this.target = config.target;
        this.connectionStrategies = config.connectionStrategies;
        this.interceptPlugins = config.plugins || [];
    }

    public registerPlugins(interceptPlugins: IInterceptPlugin[]): void {
        this.interceptPlugins.unshift(...interceptPlugins);
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
            plugins: this.interceptPlugins,
        });
        this.connections.push(connection);
        connection.startListen(this.handler);
        port.start();
    }
}
