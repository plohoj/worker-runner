import { IRunnerIdentifierConfig } from "@worker-runner/core";
import { RunnerResolverClient, RunnerResolverHost, RunnerResolverLocal } from "@worker-runner/promise";
import { RxRunnerResolverClient, RxRunnerResolverHost, RxRunnerResolverLocal } from "@worker-runner/rx";
import { runners } from "../common/runner-list";
import { ExtendedStubRunner, EXTENDED_STUB_RUNNER_TOKEN } from "../common/stubs/extended-stub.runner";

// TODO Refactoring naming

export const runnerResolver = new RunnerResolverClient({
    runners,
    connection: new Worker('base/test/host/worker.js'),
});
export const runnerResolverLocal = new RunnerResolverLocal({ runners });

export const rxRunnerResolver = new RxRunnerResolverClient({
    runners,
    connection: new Worker('base/test/host/rx-worker.js'),
});
export const rxRunnerResolverLocal = new RxRunnerResolverLocal({ runners });

export const resolverList = {
    Common: runnerResolver,
    Local: runnerResolverLocal as typeof runnerResolver,
    Rx: rxRunnerResolver as typeof runnerResolver,
    'Rx Local': rxRunnerResolverLocal as unknown  as typeof runnerResolver,
};

export const localResolvers = {
    Local: RunnerResolverLocal,
    'Rx Local': RxRunnerResolverLocal as unknown as typeof RunnerResolverLocal,
};

// #region Resolvers without LocalResolver

export const clientRunnerList = [
    ...runners.filter(runner => 
        (runner as IRunnerIdentifierConfig)?.token !== EXTENDED_STUB_RUNNER_TOKEN
    ),
    {
        token: EXTENDED_STUB_RUNNER_TOKEN,
    } as IRunnerIdentifierConfig<typeof ExtendedStubRunner, typeof EXTENDED_STUB_RUNNER_TOKEN>
];

const runnerResolverClient = new RunnerResolverClient({
    runners: clientRunnerList,
    connection: new Worker('base/test/host/worker.js'),
});
const rxRunnerResolverClient = new RxRunnerResolverClient({
    runners: clientRunnerList,
    connection: new Worker('base/test/host/rx-worker.js'),
});

export const resolverClientList = {
    Common: runnerResolverClient,
    Rx: rxRunnerResolverClient as typeof runnerResolverClient,
};

// #endregion

export const apartHostClientResolvers = {
    Common: {
        client: RunnerResolverClient,
        host: RunnerResolverHost,
    },
    Rx: {
        client: RxRunnerResolverClient as typeof RunnerResolverClient,
        host: RxRunnerResolverHost,
    },
};
