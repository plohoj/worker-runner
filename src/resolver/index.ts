import { RunnerResolverBase } from "./base-runner.resolver";
import { nodeRunnerResolverMixin } from "./node-runner.resolver";
import { workerRunnerResolverMixin } from "./worker-runner.resolver";

export const RunnerResolver = workerRunnerResolverMixin(nodeRunnerResolverMixin(RunnerResolverBase));
