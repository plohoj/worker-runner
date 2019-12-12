import { Constructor } from "@core/constructor";
import { WorkerRunnerResolverBase } from "@core/resolver/worker-runner.resolver";

export class WorkerRunnerResolver<R extends Constructor<{[key: string]: any}>> extends WorkerRunnerResolverBase<R> {

}
