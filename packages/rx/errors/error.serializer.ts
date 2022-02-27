import { WorkerRunnerErrorSerializer } from '@worker-runner/core';
import { CODE_TO_RX_ERROR_MAP } from './error-code-map';

export class RxWorkerRunnerErrorSerializer extends WorkerRunnerErrorSerializer {
    protected override readonly codeToErrorMap = CODE_TO_RX_ERROR_MAP;
}

export const RX_WORKER_RUNNER_ERROR_SERIALIZER = new RxWorkerRunnerErrorSerializer();
