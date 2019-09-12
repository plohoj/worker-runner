import { RunnerResolverBase } from "./base-runner.resolver";
import { nodeResolverMixin } from "./node-runner.resolver";
import { workerRunnerResolverMixin } from "./worker-runner.resolver";

export const RunnerResolver = workerRunnerResolverMixin(nodeResolverMixin(RunnerResolverBase));
