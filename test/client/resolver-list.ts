import { IRunnerIdentifierConfig, MessageChannelConnectionStrategyClient, RepeatConnectionStrategyClient, WorkerConnectionClient } from "@worker-runner/core";
import { RunnerResolverClient, RunnerResolverHost, RunnerResolverLocal } from "@worker-runner/promise";
import { RxRunnerResolverClient, RxRunnerResolverHost, RxRunnerResolverLocal } from '@worker-runner/rx';
import { runners } from "../common/runner-list";
import { ExtendedStubRunner, EXTENDED_STUB_RUNNER_TOKEN } from "../common/stubs/extended-stub.runner";

const clientWorker = new Worker(new URL('../host/host', import.meta.url), {name: 'HostWorker'});
const clientRxWorker = new Worker(new URL('../host/rx-host', import.meta.url), {name: 'RxHostWorker'});

const connection = new WorkerConnectionClient({
    target: clientWorker,
    strategies: [
        new MessageChannelConnectionStrategyClient(),
        new RepeatConnectionStrategyClient(),
    ]
});

const rxConnection = new WorkerConnectionClient({
    target: clientRxWorker,
    strategies: [
        new MessageChannelConnectionStrategyClient(),
        new RepeatConnectionStrategyClient(),
    ]
});

const resolvers = {
    Client: new RunnerResolverClient({ runners, connection }),
    Local: new RunnerResolverLocal({ runners }),
    'Rx Client': new RxRunnerResolverClient({ runners, connection: rxConnection }),
    'Rx Local': new RxRunnerResolverLocal({ runners }),
};

export const allResolvers = {
    Client: resolvers.Client,
    Local: resolvers.Local,
    'Rx Client': resolvers['Rx Client'] as RunnerResolverClient<typeof runners>,
    'Rx Local': resolvers["Rx Local"] as unknown as RunnerResolverLocal<typeof runners>,
};

export const rxResolvers = {
    'Rx Client': resolvers['Rx Client'],
    'Rx Local': resolvers["Rx Local"],
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
    Client: new RunnerResolverClient({ runners: clientRunnerList, connection }),
    'Rx Client': new RxRunnerResolverClient({ runners: clientRunnerList, connection: rxConnection }),
};

// #endregion

export const localResolversConstructors = {
    Local: RunnerResolverLocal,
    'Rx Local': RxRunnerResolverLocal as unknown as typeof RunnerResolverLocal,
};

export const apartHostClientResolvers = {
    Apart: {
        client: RunnerResolverClient,
        host: RunnerResolverHost,
    },
    'Rx Apart': {
        client: RxRunnerResolverClient as typeof RunnerResolverClient,
        host: RxRunnerResolverHost,
    },
};
