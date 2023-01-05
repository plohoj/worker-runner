import { MessageChannelConnectionStrategyClient, MessageChannelConnectionStrategyHost, RepeatConnectionStrategyClient, RepeatConnectionStrategyHost, RunnerIdentifierConfigList, WorkerConnectionClient } from "@worker-runner/core";
import { RunnerResolverClient, RunnerResolverHost, RunnerResolverLocal } from "@worker-runner/promise";
import { RxRunnerResolverClient, RxRunnerResolverHost, RxRunnerResolverLocal } from '@worker-runner/rx';
import { runners } from "../common/runner-list";
import { ApartResolverFactory, IApartResolverFactoryConfig, IApartRunnerResolversManager } from './types/apart-resolver-factory';
import { ResolverFactory } from './types/resolver-factory';
import { RunnerApartResolverName, RunnerResolverName, RunnerResolverPackageName } from './types/runner-resolver-name';
import { createApartClientHostResolvers } from './utils/apart-client-host-resolvers';

const resolvers = {
    'Promise#Bridge#MessageChannel': new RunnerResolverClient({
        runners,
        connection: new WorkerConnectionClient({
            target: new Worker(new URL('../host/host', import.meta.url), {name: 'HostWorker'}),
            strategies: [new MessageChannelConnectionStrategyClient()],
        }),
    }),
    'Promise#Bridge#Repeat': new RunnerResolverClient({
        runners,
        connection: new WorkerConnectionClient({
            target: new Worker(new URL('../host/host', import.meta.url), {name: 'HostWorker'}),
            strategies: [new RepeatConnectionStrategyClient()],
        }),
    }),
    'Rx#Bridge#MessageChannel': new RxRunnerResolverClient({
        runners,
        connection: new WorkerConnectionClient({
            target: new Worker(new URL('../host/rx-host', import.meta.url), {name: 'RxHostWorker'}),
            strategies: [new MessageChannelConnectionStrategyClient()],
        }),
    }),
    'Rx#Bridge#Repeat': new RxRunnerResolverClient({
        runners,
        connection: new WorkerConnectionClient({
            target: new Worker(new URL('../host/rx-host', import.meta.url), {name: 'RxHostWorker'}),
            strategies: [new RepeatConnectionStrategyClient()],
        }),
    }),
} satisfies Record<
    RunnerResolverName<RunnerResolverPackageName, 'Bridge'>,
    RunnerResolverClient | RxRunnerResolverClient
>;

export const allRunnerResolversFactories = {
    'Promise#Bridge#MessageChannel': () => resolvers['Promise#Bridge#MessageChannel'],
    'Promise#Bridge#Repeat': () => resolvers['Promise#Bridge#Repeat'],
    'Promise#Local#MessageChannel': <T extends RunnerIdentifierConfigList = typeof runners>(runnersList?: T) => new RunnerResolverLocal({
        runners: runnersList || runners,
        connectionStrategy: new MessageChannelConnectionStrategyHost(),
     }),
    'Promise#Local#Repeat': <T extends RunnerIdentifierConfigList = typeof runners>(runnersList?: T) => new RunnerResolverLocal({
        runners: runnersList || runners,
        connectionStrategy: new RepeatConnectionStrategyHost(),
    }),
    'Rx#Bridge#MessageChannel': () => resolvers['Rx#Bridge#MessageChannel'],
    'Rx#Bridge#Repeat': () => resolvers['Rx#Bridge#Repeat'],
    'Rx#Local#MessageChannel': <T extends RunnerIdentifierConfigList = typeof runners>(runnersList?: T) => new RxRunnerResolverLocal({
        runners: runnersList || runners,
        connectionStrategy: new MessageChannelConnectionStrategyHost(),
    }),
    'Rx#Local#Repeat': <T extends RunnerIdentifierConfigList = typeof runners>(runnersList?: T) => new RxRunnerResolverLocal({
        runners: runnersList || runners,
        connectionStrategy: new RepeatConnectionStrategyHost()
    }),
} satisfies Record<RunnerResolverName, ResolverFactory>;

export const apartResolversFactories = {
    'Promise#Apart': <
        CL extends RunnerIdentifierConfigList,
        HL extends RunnerIdentifierConfigList,
    >(config: IApartResolverFactoryConfig<CL, HL>): IApartRunnerResolversManager<
        RunnerResolverClient<CL>, RunnerResolverHost<HL>
    > => createApartClientHostResolvers({
        ...config,
        runnerResolverClientConstructor: RunnerResolverClient,
        runnerResolverHostConstructor: RunnerResolverHost
    }),
    'Rx#Apart': <
        CL extends RunnerIdentifierConfigList,
        HL extends RunnerIdentifierConfigList,
    >(config: IApartResolverFactoryConfig<CL, HL>): IApartRunnerResolversManager<
    RunnerResolverClient<CL>, RunnerResolverHost<HL>
    > => createApartClientHostResolvers({
        ...config,
        runnerResolverClientConstructor: RxRunnerResolverClient as typeof RunnerResolverClient,
        runnerResolverHostConstructor: RxRunnerResolverHost
    }),
} satisfies Record<RunnerApartResolverName, ApartResolverFactory>
