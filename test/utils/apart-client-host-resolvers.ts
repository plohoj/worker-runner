import { IRunnerResolverClientBaseConfig, MessageEventConnectionClient, MessageEventConnectionHost, RepeatConnectionStrategyClient, RepeatConnectionStrategyHost, RunnerIdentifierConfigList } from "@worker-runner/core";
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
    hostConfig: {
        runners: HL
    },
    runnerResolverClientConstructor: typeof RunnerResolverClient,
    runnerResolverHostConstructor: typeof RunnerResolverHost,
}): IApartConfiguredRunnerResolvers<CL, HL> {
    const messageChannel = new MessageChannel();
    const runnerResolverClient = new config.runnerResolverClientConstructor({
        ...config.clientConfig,
        connection: new MessageEventConnectionClient({
            target: messageChannel.port1,
            strategies: [new RepeatConnectionStrategyClient()],
        }),
    });
    const runnerResolverHost = new config.runnerResolverHostConstructor({
        ...config.hostConfig,
        connection: new MessageEventConnectionHost({
            target: messageChannel.port2,
            strategies: [new RepeatConnectionStrategyHost()],
        }),
    });

    const result: IApartConfiguredRunnerResolvers<CL, HL> = {
        client: runnerResolverClient,
        host: runnerResolverHost,
        async run(): Promise<void> {
            messageChannel.port1.start();
            messageChannel.port2.start();
            runnerResolverHost.run();
            await runnerResolverClient.run();
        },
        async destroy(): Promise<void> {
            await runnerResolverClient.destroy();
            await runnerResolverHost.destroy();
            messageChannel.port1.close();
            messageChannel.port2.close();
        },
    };
    return result;
}
