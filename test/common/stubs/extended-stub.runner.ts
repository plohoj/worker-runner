import { JsonLike } from '@worker-runner/core';
import { ExecutableStubRunner } from './executable-stub.runner';

export const EXTENDED_STUB_RUNNER_TOKEN = 'ExtendedStubRunnerToken';

export class ExtendedStubRunner<T extends JsonLike> extends ExecutableStubRunner<T> {}
