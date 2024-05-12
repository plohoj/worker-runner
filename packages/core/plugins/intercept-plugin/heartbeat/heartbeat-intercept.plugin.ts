import { IInterceptPlugin } from '../intercept.plugin';
import { HeartbeatConnectionChannelInterceptor } from './heartbeat.connection-channel-interceptor';

export interface IHeartbeatInterceptPluginConfig {
    sendInterval?: number;
    receiveTimeout?: number;
    onConnectionLost?: () => void;
}

/**
 * This plugin checks that the connection is still active.
 * Some connections, such as {@link SharedWorker}, do not receive an event that the connection has been disconnected,
 * In such cases it is necessary to perform a periodic check.
 * For this:
 * * Each time interval an event will be sent to the other side that the connection is still active.
 * * A time limit is set from the previous event (that the connection is still active) to a new event from the other side.
 *
 * If the event (that the connection is still active) is not received within the time limit,
 * the connection will be terminated, and all resolved Runners will be destroyed.
 * 
 * Attention: The plugin must be added for both sides (client and host)
 * 
 * Note: the sending interval on the current side must be less than the receiving timeout on the other side
 */
export class HeartbeatInterceptPlugin implements IInterceptPlugin {
    private readonly sendInterval: number;
    private readonly receiveTimeout: number;
    private readonly onConnectionLost?: () => void;

    constructor(config: IHeartbeatInterceptPluginConfig = {}) {
        this.sendInterval = config.sendInterval || 3000;
        this.receiveTimeout = config.receiveTimeout || (this.sendInterval * 1.5);
        this.onConnectionLost = config.onConnectionLost;
    }

    public getInterceptorAfterConnect(): HeartbeatConnectionChannelInterceptor {
        return new HeartbeatConnectionChannelInterceptor({
            sendInterval: this.sendInterval,
            receiveTimeout: this.receiveTimeout,
            onConnectionLost: this.onConnectionLost,
        });
    }
}
