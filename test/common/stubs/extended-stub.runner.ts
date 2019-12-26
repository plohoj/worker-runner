import { JsonObject } from '@core';
import { ExecutableStubRunner } from './executable-stub.runner';

export class ExtendedStubRunner<T extends JsonObject> extends ExecutableStubRunner<T> {}
