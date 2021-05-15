import { ISoftRunnerTokenConfig } from "@worker-runner/core";
import { runners } from "../common/runner-list";
import { ExtendedStubRunner, EXTENDED_STUB_RUNNER_TOKEN } from "../common/stubs/extended-stub.runner";

export const clientRunner = [
    ...runners.filter(runner => 
        (runner as ISoftRunnerTokenConfig)?.token !== EXTENDED_STUB_RUNNER_TOKEN
    ),
    {
        token: EXTENDED_STUB_RUNNER_TOKEN as typeof EXTENDED_STUB_RUNNER_TOKEN,
    } as ISoftRunnerTokenConfig<typeof ExtendedStubRunner, typeof EXTENDED_STUB_RUNNER_TOKEN>
];
