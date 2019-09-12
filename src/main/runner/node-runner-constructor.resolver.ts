import { Constructor } from "main/constructor";
import { ResolveRunner } from "./resolved-runner";
import { RunnerInstance } from "./runner-instance";

function recursiveOverrideProperty(construct: Constructor, proto: Constructor) {
    for (const key of Object.getOwnPropertyNames(proto.prototype)) {
        if (key !== 'constructor') {
            construct.prototype[key] = function(this: RunnerInstance, ...args: any[]) {
                return this._executeMethod(key, args);
            }
        }
        const parent = Object.getPrototypeOf(proto);
        if (parent.prototype) {
            recursiveOverrideProperty(construct, parent);
        }
    }
}

export function resolveNodeRunnerConstructor<T extends Constructor>(runner: T):
        typeof RunnerInstance & Constructor<ResolveRunner<InstanceType<T>>> {
    const constructor = class extends RunnerInstance {}
    recursiveOverrideProperty(constructor, runner);
    return constructor as any;
}
