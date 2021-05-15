import { JsonObject } from '@worker-runner/core';
import { ExecutableStubRunner } from './executable-stub.runner';

export const EXTENDED_STUB_RUNNER_TOKEN = 'ExtendedStubRunnerToken';

export class ExtendedStubRunner<T extends JsonObject> extends ExecutableStubRunner<T> {}
