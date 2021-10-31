import { IRunnerIdentifierConfig } from "@worker-runner/core";
import { RunnerResolverClient, RunnerResolverHost, RunnerResolverLocal } from "@worker-runner/promise";
import { RxRunnerResolverClient, RxRunnerResolverHost, RxRunnerResolverLocal } from "@worker-runner/rx";
import { runners } from "../common/runner-list";
import { ExtendedStubRunner, EXTENDED_STUB_RUNNER_TOKEN } from "../common/stubs/extended-stub.runner";

const clientWorker = new Worker('base/test/host/host.js');
const clientRxWorker = new Worker('base/test/host/rx-host.js');

const resolvers = {
    Client: new RunnerResolverClient({ runners, connection: clientWorker }),
    Local: new RunnerResolverLocal({ runners }),
    'Rx Client': new RxRunnerResolverClient({ runners, connection: clientRxWorker}),
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
    Client: new RunnerResolverClient({ runners: clientRunnerList, connection: clientWorker }),
    'Rx Client': new RxRunnerResolverClient({ runners: clientRunnerList, connection: clientRxWorker }),
};

// #endregion

export const localResolversConstructors = {
    Local: RunnerResolverLocal,
    'Rx Local': RxRunnerResolverLocal as unknown as typeof RunnerResolverLocal,
};

export const apartHostClientResolvers = {
    Client: {
        client: RunnerResolverClient,
        host: RunnerResolverHost,
    },
    'Rx Client': {
        client: RxRunnerResolverClient as typeof RunnerResolverClient,
        host: RxRunnerResolverHost,
    },
};
