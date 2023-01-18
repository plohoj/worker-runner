import { Constructor, IRunnerResolverClientBaseConfig, IRunnerResolverHostConfigBase, MessageEventConnectionClient, MessageEventConnectionHost, RepeatConnectionStrategyClient, RepeatConnectionStrategyHost, RunnerIdentifierConfigList, RunnerResolverClientBase, RunnerResolverHostBase } from "@worker-runner/core";
import { IApartResolverFactoryConfig, IApartRunnerResolversManager } from '../types/apart-resolver-factory';

export function createApartClientHostResolvers<
    CL extends RunnerIdentifierConfigList,
    HL extends RunnerIdentifierConfigList,
    C extends RunnerResolverClientBase<CL> = RunnerResolverClientBase<CL>,
    H extends RunnerResolverHostBase<HL> = RunnerResolverHostBase<HL>,
>(config: IApartResolverFactoryConfig<CL, HL> & {
    runnerResolverClientConstructor: Constructor<C, [IRunnerResolverClientBaseConfig<CL>]>,
    runnerResolverHostConstructor: Constructor<H, [IRunnerResolverHostConfigBase<HL>]>,
}): IApartRunnerResolversManager<C, H> {
    const messageChannel = new MessageChannel();
    const runnerResolverClient = new config.runnerResolverClientConstructor({
        ...config.clientConfig,
        connection: new MessageEventConnectionClient({
            target: messageChannel.port1,
            connectionStrategies: [new RepeatConnectionStrategyClient()],
        }),
    });
    const runnerResolverHost = new config.runnerResolverHostConstructor({
        ...config.hostConfig,
        connection: new MessageEventConnectionHost({
            target: messageChannel.port2,
            connectionStrategies: [new RepeatConnectionStrategyHost()],
        }),
    });

    const result: IApartRunnerResolversManager<C, H> = {
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
