import { IRunnerIdentifierConfig, MessageChannelConnectionStrategyClient, RepeatConnectionStrategyClient, WorkerConnectionClient } from "@worker-runner/core";
import { RunnerResolverClient, RunnerResolverHost, RunnerResolverLocal } from "@worker-runner/promise";
import { RxRunnerResolverClient, RxRunnerResolverHost, RxRunnerResolverLocal } from '@worker-runner/rx';
import { runners } from "../common/runner-list";
import { ExtendedStubRunner, EXTENDED_STUB_RUNNER_TOKEN } from "../common/stubs/extended-stub.runner";

const connections = {
    messageChannel: new WorkerConnectionClient({
        target: new Worker(new URL('../host/host', import.meta.url), {name: 'HostWorker'}),
        strategies: [new MessageChannelConnectionStrategyClient()],
    }),
    rxMessageChannel: new WorkerConnectionClient({
        target: new Worker(new URL('../host/rx-host', import.meta.url), {name: 'RxHostWorker'}),
        strategies: [new MessageChannelConnectionStrategyClient()],
    }),
    repeat: new WorkerConnectionClient({
        target: new Worker(new URL('../host/host', import.meta.url), {name: 'HostWorker'}),
        strategies: [new RepeatConnectionStrategyClient()],
    }),
    rxRepeat: new WorkerConnectionClient({
        target: new Worker(new URL('../host/rx-host', import.meta.url), {name: 'RxHostWorker'}),
        strategies: [new RepeatConnectionStrategyClient()],
    }),
};

const resolvers = {
    'MessageChannel#Client': new RunnerResolverClient({ runners, connection: connections.messageChannel }),
    'Repeat#Client': new RunnerResolverClient({ runners, connection: connections.repeat }),
    'Repeat#Local': new RunnerResolverLocal({ runners }), // TODO Choosing a strategy for RunnerResolverLocal
    'Rx#MessageChannel#Client': new RxRunnerResolverClient({ runners, connection: connections.rxMessageChannel }),
    'Rx#Repeat#Client': new RxRunnerResolverClient({ runners, connection: connections.rxRepeat }),
    'Rx#Repeat#Local': new RxRunnerResolverLocal({ runners }),
};

export const allResolvers = {
    'MessageChannel#Client': resolvers['MessageChannel#Client'],
    'Repeat#Client': resolvers['Repeat#Client'],
    'Repeat#Local': resolvers['Repeat#Local'],
    'Rx#MessageChannel#Client': resolvers['Rx#MessageChannel#Client'] as RunnerResolverClient<typeof runners>,
    'Rx#Repeat#Client': resolvers['Rx#Repeat#Client'] as RunnerResolverClient<typeof runners>,
    'Rx#Repeat#Local': resolvers["Rx#Repeat#Local"] as unknown as RunnerResolverLocal<typeof runners>,
};

export const rxResolvers = {
    'Rx#MessageChannel#Client': resolvers['Rx#MessageChannel#Client'],
    'Rx#Repeat#Client': resolvers['Rx#Repeat#Client'],
    'Rx#Repeat#Local': resolvers["Rx#Repeat#Local"],
}

// #region Resolvers without LocalResolver
const clientRunnerList = [
    ...runners.filter(runner => 
        (runner as IRunnerIdentifierConfig)?.token !== EXTENDED_STUB_RUNNER_TOKEN
    ),
    {
        token: EXTENDED_STUB_RUNNER_TOKEN,
    } as IRunnerIdentifierConfig<typeof ExtendedStubRunner, typeof EXTENDED_STUB_RUNNER_TOKEN>
];

export const resolverClientList = {
    'MessageChannel#Client': new RunnerResolverClient({ runners: clientRunnerList, connection: connections.messageChannel }),
    'Repeat#Client': new RunnerResolverClient({ runners: clientRunnerList, connection: connections.repeat }),
    'Rx#MessageChannel#Client': new RxRunnerResolverClient({
        runners: clientRunnerList, connection: connections.rxMessageChannel
    }) as RunnerResolverClient<typeof clientRunnerList>,
    'Rx#Repeat#Client': new RxRunnerResolverClient({
        runners: clientRunnerList, connection: connections.rxRepeat
    }) as RunnerResolverClient<typeof clientRunnerList>,
};
// #endregion

export const localResolversConstructors = {
    'Repeat#Local': RunnerResolverLocal,
    'Rx#Repeat#Local': RxRunnerResolverLocal as unknown as typeof RunnerResolverLocal,
};

export const apartHostClientResolvers = {
    'Apart': {
        client: RunnerResolverClient,
        host: RunnerResolverHost,
    },
    'Rx#Apart': {
        client: RxRunnerResolverClient as typeof RunnerResolverClient,
        host: RxRunnerResolverHost,
    },
};
