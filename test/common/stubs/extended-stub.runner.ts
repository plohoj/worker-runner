import { JsonObject } from '@worker-runner/core';
import { ExecutableStubRunner } from './executable-stub.runner';

export class ExtendedStubRunner<T extends JsonObject> extends ExecutableStubRunner<T> {}
