import { Constructor } from "../constructor";
import { RunnerResolverBase } from "./base-runner.resolver";
import { nodeRunnerResolverMixin } from "./node-runner.resolver";
import { workerRunnerResolverMixin } from "./worker-runner.resolver";

export class RunnerResolver<R extends Constructor<{[key: string]: any}>>
    extends workerRunnerResolverMixin(nodeRunnerResolverMixin(RunnerResolverBase))<R> {};
