import { IClientRunnerResolverConfigBase, IHostRunnerResolverConfigBase, SoftRunnersList, StrictRunnersList } from "@worker-runner/core";
import { ClientRunnerResolver, HostRunnerResolver } from "@worker-runner/promise";

interface IApartConfiguredLocalRunnerResolvers<
    CL extends SoftRunnersList,
    HL extends StrictRunnersList,
> {
    client: ClientRunnerResolver<CL>;
    host: HostRunnerResolver<HL>;
    run(): Promise<void>;
    destroy(): Promise<void>;
}

export function createApartClientHostResolvers<
    CL extends SoftRunnersList,
    HL extends StrictRunnersList,
>(config: {
    clientConfig?: IClientRunnerResolverConfigBase<CL>,
    hostConfig: IHostRunnerResolverConfigBase<HL>,
    clientResolverConstructor: typeof ClientRunnerResolver,
    hostResolverConstructor: typeof HostRunnerResolver,
}): IApartConfiguredLocalRunnerResolvers<CL, HL> {
    const messageChanel = new MessageChannel();
    const clientResolver = new config.clientResolverConstructor({
        ...config.clientConfig,
        connection: messageChanel.port1,
    });
    const hostResolver = new config.hostResolverConstructor({
        ...config.hostConfig,
        connections: [messageChanel.port2],
    });

    const result: IApartConfiguredLocalRunnerResolvers<CL, HL> = {
        client: clientResolver,
        host: hostResolver,
        async run(): Promise<void> {
            messageChanel.port1.start();
            messageChanel.port2.start();
            hostResolver.run();
            await clientResolver.run();
        },
        async destroy(): Promise<void> {
            await clientResolver.destroy();
            await hostResolver.destroy();
            messageChanel.port1.close();
            messageChanel.port2.close();
        },
    };
    return result;
}
