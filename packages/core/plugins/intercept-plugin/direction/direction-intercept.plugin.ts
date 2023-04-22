import { IInterceptPlugin } from '../intercept.plugin';
import { DirectionConnectionChannelInterceptor, IDirectionConnectionIdentificationCheckerConfig } from './direction.connection-channel-interceptor';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { RunnerResolverHostBase } from '../../../runner-resolver/host/runner-resolver.host';

export interface IDirectionConnectionIdentificationStrategyClientConfig {
    from: string;
    to: string;
}

/**
 * This direction identification plugin is necessary:
 * * If the connection channel duplicates outgoing messages to incoming messages
 * (for example, window when using an iframe)
 * * If the connection channel transmits noise (stranger code messages)
 * (for example, browser extensions can use window to communicate with his own code)
 * * If the connection channel has more than one {@link RunnerResolverHostBase}
 * (In this case, you need to specify a custom connection direction identifier)
 */
export class DirectionInterceptPlugin implements IInterceptPlugin {
    private readonly interceptor: DirectionConnectionChannelInterceptor;

    constructor(config: IDirectionConnectionIdentificationStrategyClientConfig) {
        this.interceptor = new DirectionConnectionChannelInterceptor(
            config as unknown as IDirectionConnectionIdentificationCheckerConfig,
        );
    }

    public getInterceptorBeforeConnect(): DirectionConnectionChannelInterceptor {
        return this.interceptor;
    }
    
    public getInterceptorAfterConnect(): DirectionConnectionChannelInterceptor {
        return this.interceptor;
    }
}
