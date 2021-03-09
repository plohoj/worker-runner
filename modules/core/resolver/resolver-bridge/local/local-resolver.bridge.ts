import { RunnersList } from "../../../runner/runner-bridge/runners-list.controller";
import { HostRunnerResolverBase } from "../../host/host-runner.resolver";
import { ClientResolverBridge } from "../client/client-resolver.bridge";

export interface ILocalResolverBridgeConfig<L extends RunnersList> {
    hostRunnerResolverFactory: (
        config: { connections: [MessagePort] }
    ) => HostRunnerResolverBase<L>;
}

export class LocalResolverBridge<L extends RunnersList> extends ClientResolverBridge {
    public readonly hostRunnerResolver: HostRunnerResolverBase<L>;

    constructor (config: ILocalResolverBridgeConfig<L>) {
        const messageChanel = new MessageChannel();
        messageChanel.port1.start();
        messageChanel.port2.start();
        super({
            connection: messageChanel.port1,
        });
        this.hostRunnerResolver = config.hostRunnerResolverFactory({
            connections: [ messageChanel.port2]
        });
        this.hostRunnerResolver.run();
    }
}
