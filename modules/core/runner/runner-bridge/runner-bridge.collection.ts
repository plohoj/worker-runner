import { Constructor, RunnerConstructor } from "../../types/constructor";
import { JsonObject } from "../../types/json-object";
import { EXECUTE_RUNNER_CONTROLLER_METHOD, IRunnerBridgeConstructor, RunnerBridge } from "./runner.bridge";

interface IRunnerBridgeCollectionConfig<R extends RunnerConstructor> {
    runners: readonly R[];
}

export class RunnerBridgeCollection<R extends RunnerConstructor> {
    public runnerBridgeConstructors: readonly IRunnerBridgeConstructor<R>[];
    public readonly runners: readonly R[];

    constructor(config: IRunnerBridgeCollectionConfig<R>) {
        this.runners = config.runners;
        this.runnerBridgeConstructors = this.runners.map(runner => this.resolveRunnerBridgeConstructor(runner));
    }

    public getRunnerId(runner: R): number {
        const runnerId = this.runners.indexOf(runner);
        if (runnerId < 0) {
            throw new Error();
        }
        return runnerId;
    }

    public getRunnerIdByInstance(runnerInstance: InstanceType<R>): number {
        return this.getRunnerId(Object.getPrototypeOf(runnerInstance).constructor);
    }

    public getRunner(runnerId: number): R {
        const runner = this.runners[runnerId];
        if (!runner) {
            throw new Error();
        }
        return runner;
    }

    public getRunnerBridgeConstructor(runnerId: number): IRunnerBridgeConstructor<R> {
        const runnerBridgeConstructor = this.runnerBridgeConstructors[runnerId];
        if (!runnerBridgeConstructor) {
            throw new Error();
        }
        return runnerBridgeConstructor;
    }

    private recursiveOverrideProperty(construct: Constructor, proto: Constructor) {
        for (const key of Object.getOwnPropertyNames(proto.prototype)) {
            if (!(key in RunnerBridge.prototype)) {
                construct.prototype[key] = function(this: RunnerBridge, ...args: JsonObject[]) {
                    return this[EXECUTE_RUNNER_CONTROLLER_METHOD](key, args);
                };
            }
            const parent = Object.getPrototypeOf(proto);
            if (parent.prototype) {
                this.recursiveOverrideProperty(construct, parent);
            }
        }
    }

    private resolveRunnerBridgeConstructor(runner: R): IRunnerBridgeConstructor<R> {
        const className = 'Resolved' + runner.name;
        const ResolvedRunner = {[className]: class extends RunnerBridge {}}[className];
        this.recursiveOverrideProperty(ResolvedRunner, runner);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ResolvedRunner as any;
    }
} 
