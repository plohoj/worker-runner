import { Constructor, RunnerConstructor } from '../types/constructor';
import { JsonObject } from '../types/json-object';
import { EXECUTE_RUNNER_BRIDGE_METHOD, IRunnerBridgeConstructor, RunnerBridge } from './runner-bridge';

function recursiveOverrideProperty(construct: Constructor, proto: Constructor) {
    for (const key of Object.getOwnPropertyNames(proto.prototype)) {
        if (!(key in RunnerBridge.prototype)) {
            construct.prototype[key] = function(this: RunnerBridge, ...args: JsonObject[]) {
                return this[EXECUTE_RUNNER_BRIDGE_METHOD](key, args);
            };
        }
        const parent = Object.getPrototypeOf(proto);
        if (parent.prototype) {
            recursiveOverrideProperty(construct, parent);
        }
    }
}

export function resolveRunnerBridgeConstructor<T extends RunnerConstructor>(runner: T): IRunnerBridgeConstructor<T> {
    const className = 'Resolved' + runner.name;
    const ResolvedRunner = {[className]: class extends RunnerBridge {}}[className];
    recursiveOverrideProperty(ResolvedRunner, runner);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ResolvedRunner as any;
}
