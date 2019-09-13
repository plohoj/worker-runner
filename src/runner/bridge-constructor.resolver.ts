import { Constructor } from "../constructor";
import { IRunnerBridge, RunnerBridge } from "./runner-bridge";

function recursiveOverrideProperty(construct: Constructor, proto: Constructor) {
    for (const key of Object.getOwnPropertyNames(proto.prototype)) {
        if (key !== 'constructor') {
            construct.prototype[key] = function(this: RunnerBridge, ...args: any[]) {
                return this._executeMethod(key, args);
            }
        }
        const parent = Object.getPrototypeOf(proto);
        if (parent.prototype) {
            recursiveOverrideProperty(construct, parent);
        }
    }
}

export function resolveRunnerBridgeConstructor<T extends Constructor>(runner: T):
        typeof RunnerBridge & IRunnerBridge<T> {
    const constructor = class extends RunnerBridge {}
    recursiveOverrideProperty(constructor, runner);
    return constructor as any;
}
