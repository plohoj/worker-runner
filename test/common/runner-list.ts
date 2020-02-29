
import { ErrorStubRunner } from './stubs/error-stub.runner';
import { ExecutableStubRunner } from './stubs/executable-stub.runner';
import { ExtendedStubRunner } from './stubs/extended-stub.runner';
import { RxStubRunner } from './stubs/rx-stub.runner';
import { WithLocalResolverStub } from './stubs/with-local-resolver-stub.runner';
import { WithOtherInstanceStubRunner } from './stubs/with-other-instance-stub.runner';

export const runners = [
    ErrorStubRunner,
    ExecutableStubRunner,
    ExtendedStubRunner,
    WithOtherInstanceStubRunner,

    RxStubRunner,
    WithLocalResolverStub,
];
