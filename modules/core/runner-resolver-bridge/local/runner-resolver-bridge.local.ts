import { RunnerResolverHostBase } from '../../runner-resolver/host/runner-resolver.host';
import { RunnerIdentifierConfigList } from '../../types/runner-identifier';
import { RunnerResolverBridgeClient } from '../client/runner-resolver-bridge.client';

export interface IRunnerResolverBridgeLocalConfig<L extends RunnerIdentifierConfigList> {
    runnerResolverHostFactory: (
        config: { connections: [MessagePort] }
    ) => RunnerResolverHostBase<L>;
}

export class RunnerResolverBridgeLocal<L extends RunnerIdentifierConfigList> extends RunnerResolverBridgeClient {
    public readonly runnerResolverHost: RunnerResolverHostBase<L>;

    constructor (config: IRunnerResolverBridgeLocalConfig<L>) {
        const messageChanel = new MessageChannel();
        messageChanel.port1.start();
        messageChanel.port2.start();
        super({
            connection: messageChanel.port1,
        });
        this.runnerResolverHost = config.runnerResolverHostFactory({
            connections: [ messageChanel.port2]
        });
        this.runnerResolverHost.run();
    }
}
