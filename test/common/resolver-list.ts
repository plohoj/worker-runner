import { localRunnerResolver, runnerResolver } from "./promise";
import { rxLocalRunnerResolver, rxRunnerResolver } from "./rx";

export const resolverList = {
    Common: runnerResolver,
    Local: localRunnerResolver,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Rx: rxRunnerResolver as any as typeof runnerResolver,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'Rx Local': rxLocalRunnerResolver as any as typeof localRunnerResolver,
};
