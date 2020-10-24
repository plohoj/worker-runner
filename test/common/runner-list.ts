
import { ErrorStubRunner } from './stubs/error-stub.runner';
import { ExecutableStubRunner } from './stubs/executable-stub.runner';
import { ExtendedStubRunner } from './stubs/extended-stub.runner';
import { RxStubRunner } from './stubs/rx-stub.runner';
import { WithLocalResolverStub } from './stubs/with-local-resolver-stub.runner';
import { WithOtherInstanceStubRunner } from './stubs/with-other-instance-stub.runner';
import { WithTransferableRunnerStub } from './stubs/with-transferable-data.stub';

export const EXECUTABLE_STUB_RUNNER_TOKEN = 'ExecutableStubRunnerToken';

export const runners = [
    ErrorStubRunner,
    {
        token: EXECUTABLE_STUB_RUNNER_TOKEN as typeof EXECUTABLE_STUB_RUNNER_TOKEN,
        runner: ExecutableStubRunner,
    },
    ExtendedStubRunner,
    WithOtherInstanceStubRunner,
    RxStubRunner,
    WithLocalResolverStub,
    WithTransferableRunnerStub,
];
