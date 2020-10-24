import { localRunnerResolver, runnerResolver } from "./promise";
import { rxLocalRunnerResolver, rxRunnerResolver } from "./rx";

export const resolverList = {
    Common: runnerResolver,
    Local: localRunnerResolver,
    Rx: rxRunnerResolver as unknown as typeof runnerResolver,
    'Rx Local': rxLocalRunnerResolver as unknown as typeof localRunnerResolver,
};
