import { ISoftRunnerTokenConfig } from "@worker-runner/core";
import { ClientRunnerResolver, LocalRunnerResolver } from "@worker-runner/promise";
import { RxClientRunnerResolver, RxLocalRunnerResolver } from "@worker-runner/rx";
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
    Local: localRunnerResolver,
    Rx: rxRunnerResolver as unknown as typeof runnerResolver,
    'Rx Local': rxLocalRunnerResolver as unknown as typeof localRunnerResolver,
};

// Resolvers without LocalResolver

export const clientRunnerList = [
    ...runners.filter(runner => 
        (runner as ISoftRunnerTokenConfig)?.token !== EXTENDED_STUB_RUNNER_TOKEN
    ),
    {
        token: EXTENDED_STUB_RUNNER_TOKEN,
    } as ISoftRunnerTokenConfig<typeof ExtendedStubRunner, typeof EXTENDED_STUB_RUNNER_TOKEN>
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
    Rx: clientRxRunnerResolver as unknown as typeof clientRunnerResolver,
};
