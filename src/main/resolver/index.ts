import { RunnerResolverBase } from "./base-resolver";
import { nodeResolverMixin } from "./node-resolver";
import { workerResolverMixin } from "./worker-resolver";

export const RunnerResolver = workerResolverMixin(nodeResolverMixin(RunnerResolverBase));
