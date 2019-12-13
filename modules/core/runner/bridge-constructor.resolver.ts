import { Constructor, RunnerConstructor } from '@core/types/constructor';
import { JsonObject } from '@core/types/json-object';
import { IRunnerBridgeConstructor, RunnerBridge } from './runner-bridge';

function recursiveOverrideProperty(construct: Constructor, proto: Constructor) {
    for (const key of Object.getOwnPropertyNames(proto.prototype)) {
        if (key !== 'constructor' && key !== 'destroy') {
            construct.prototype[key] = function(this: RunnerBridge, ...args: JsonObject[]) {
                return this._executeMethod(key, args);
            };
        }
        const parent = Object.getPrototypeOf(proto);
        if (parent.prototype) {
            recursiveOverrideProperty(construct, parent);
        }
    }
}

export function resolveRunnerBridgeConstructor<T extends RunnerConstructor>(runner: T): IRunnerBridgeConstructor<T> {
    const constructor = class extends RunnerBridge {};
    recursiveOverrideProperty(constructor, runner);
    return constructor as any;
}
