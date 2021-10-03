import { IRunnerResolverClientBaseConfig, IRunnerResolverHostConfigBase, RunnerIdentifierConfigList } from "@worker-runner/core";
import { RunnerResolverClient, RunnerResolverHost } from "@worker-runner/promise";

interface IApartConfiguredRunnerResolvers<
    CL extends RunnerIdentifierConfigList,
    HL extends RunnerIdentifierConfigList,
> {
    client: RunnerResolverClient<CL>;
    host: RunnerResolverHost<HL>;
    run(): Promise<void>;
    destroy(): Promise<void>;
}

export function createApartClientHostResolvers<
    CL extends RunnerIdentifierConfigList,
    HL extends RunnerIdentifierConfigList,
>(config: {
    clientConfig?: Omit<IRunnerResolverClientBaseConfig<CL>, 'connection'>,
    hostConfig: IRunnerResolverHostConfigBase<HL>,
    runnerResolverClientConstructor: typeof RunnerResolverClient,
    runnerResolverHostConstructor: typeof RunnerResolverHost,
}): IApartConfiguredRunnerResolvers<CL, HL> {
    const messageChanel = new MessageChannel();
    const runnerResolverClient = new config.runnerResolverClientConstructor({
        ...config.clientConfig,
        connection: messageChanel.port1,
    });
    const runnerResolverHost = new config.runnerResolverHostConstructor({
        ...config.hostConfig,
        connections: [messageChanel.port2],
    });

    const result: IApartConfiguredRunnerResolvers<CL, HL> = {
        client: runnerResolverClient,
        host: runnerResolverHost,
        async run(): Promise<void> {
            messageChanel.port1.start();
            messageChanel.port2.start();
            runnerResolverHost.run();
            await runnerResolverClient.run();
        },
        async destroy(): Promise<void> {
            await runnerResolverClient.destroy();
            await runnerResolverHost.destroy();
            messageChanel.port1.close();
            messageChanel.port2.close();
        },
    };
    return result;
}
