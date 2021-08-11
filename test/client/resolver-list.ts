import { IRunnerIdentifierConfig } from "@worker-runner/core";
import { ClientRunnerResolver, HostRunnerResolver, LocalRunnerResolver } from "@worker-runner/promise";
import { RxClientRunnerResolver, RxHostRunnerResolver, RxLocalRunnerResolver } from "@worker-runner/rx";
import { runners } from "../common/runner-list";
import { ExtendedStubRunner, EXTENDED_STUB_RUNNER_TOKEN } from "../common/stubs/extended-stub.runner";

export const runnerResolver = new ClientRunnerResolver({
    runners,
    connection: new Worker('base/test/host/worker.js'),
});
export const localRunnerResolver = new LocalRunnerResolver({ runners });

export const rxRunnerResolver = new RxClientRunnerResolver({
    runners,
    connection: new Worker('base/test/host/rx-worker.js'),
});
export const rxLocalRunnerResolver = new RxLocalRunnerResolver({ runners });

export const resolverList = {
    Common: runnerResolver,
    Local: localRunnerResolver as typeof runnerResolver,
    Rx: rxRunnerResolver as typeof runnerResolver,
    'Rx Local': rxLocalRunnerResolver as unknown  as typeof runnerResolver,
};

// Resolvers without LocalResolver

export const clientRunnerList = [
    ...runners.filter(runner => 
        (runner as IRunnerIdentifierConfig)?.token !== EXTENDED_STUB_RUNNER_TOKEN
    ),
    {
        token: EXTENDED_STUB_RUNNER_TOKEN,
    } as IRunnerIdentifierConfig<typeof ExtendedStubRunner, typeof EXTENDED_STUB_RUNNER_TOKEN>
];

const clientRunnerResolver = new ClientRunnerResolver({
    runners: clientRunnerList,
    connection: new Worker('base/test/host/worker.js'),
});
const clientRxRunnerResolver = new RxClientRunnerResolver({
    runners: clientRunnerList,
    connection: new Worker('base/test/host/rx-worker.js'),
});

export const clientResolverList = {
    Common: clientRunnerResolver,
    Rx: clientRxRunnerResolver as typeof clientRunnerResolver,
};

export const localResolvers = {
    Local: LocalRunnerResolver,
    'Rx Local': RxLocalRunnerResolver as unknown as typeof LocalRunnerResolver,
};

export const apartHostClientResolvers = {
    Common: {
        client: ClientRunnerResolver,
        host: HostRunnerResolver,
    },
    Rx: {
        client: RxClientRunnerResolver as typeof ClientRunnerResolver,
        host: RxHostRunnerResolver,
    },
};
