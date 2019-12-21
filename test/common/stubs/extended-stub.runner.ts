import { JsonObject } from '@core/types/json-object';
import { ExecutableStubRunner } from './executable-stub.runner';

export class ExtendedStubRunner<T extends JsonObject> extends ExecutableStubRunner<T> {}
