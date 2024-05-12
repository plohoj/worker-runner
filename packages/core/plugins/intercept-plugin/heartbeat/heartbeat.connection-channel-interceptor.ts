import { ConnectionChannelInterceptorRejectEnum, IConnectionChannelInterceptResult, IConnectionChannelInterceptResultOptions, IConnectionChannelInterceptor } from '../../../connection-channel-interceptor/connection-channel-interceptor';
import { IBaseConnectionChannel } from '../../../connection-channels/base.connection-channel';
import { DisconnectReason } from '../../../connections/base/disconnect-reason';
import { IAction } from '../../../types/action';
import { HeartbeatAction, IHeartbeatPulseAction } from './heartbeat.actions';

export interface IHeartbeatConnectionChannelInterceptorConfig {
    sendInterval?: number;
    receiveTimeout?: number;
    onConnectionLost?: () => void;
}

export class HeartbeatConnectionChannelInterceptor implements IConnectionChannelInterceptor {
    private readonly sendInterval: number;
    private readonly receiveTimeout: number;
    private readonly onConnectionLost?: () => void;
    private connectionChannel!: IBaseConnectionChannel;
    private sendIntervalKey!: ReturnType<typeof setInterval>;
    private receiveTimerKey?: ReturnType<typeof setTimeout>;

    constructor(config: IHeartbeatConnectionChannelInterceptorConfig) {
        this.sendInterval = config.sendInterval || 3000;
        this.receiveTimeout = config.receiveTimeout || (this.sendInterval * 1.5);
        this.onConnectionLost = config.onConnectionLost;
        this.setSendHeartbeatPulseActionInterval();
        this.setReceiveTimeoutTimer();
    }

    public register(connectionChannel: IBaseConnectionChannel): void {
        this.connectionChannel = connectionChannel;
    }

    public interceptSendResult({rejected}: IConnectionChannelInterceptResultOptions): void {
        if (!rejected) {
            clearInterval(this.sendIntervalKey);
            this.setSendHeartbeatPulseActionInterval();
        }
    }

    public interceptReceive(action: IAction | IHeartbeatPulseAction): IConnectionChannelInterceptResult {
        clearTimeout(this.receiveTimerKey);
        this.setReceiveTimeoutTimer();
        if (action.type === HeartbeatAction.HeartbeatPulse) {
            return {
                rejected: ConnectionChannelInterceptorRejectEnum.Hard,
            }
        }
        return {};
    }

    public destroy(): void {
        clearInterval(this.sendIntervalKey);
        clearTimeout(this.receiveTimerKey);
    }

    private setSendHeartbeatPulseActionInterval(): void {
        this.sendIntervalKey = setInterval(() => {
            this.connectionChannel.sendAction({
                type: HeartbeatAction.HeartbeatPulse,
            } satisfies IHeartbeatPulseAction);
        }, this.sendInterval);
    }

    private setReceiveTimeoutTimer(): void {
        // TODO Need send Disconnect action?
        this.receiveTimerKey = setTimeout(() => {
            this.connectionChannel.destroy({
                disconnectReason: DisconnectReason.ConnectionLost,
            });
            this.onConnectionLost?.();
            // Destroying the interceptor will be invoked from the Connection Instance
        }, this.receiveTimeout);
    }
}
