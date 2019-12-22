import { IRunnerError } from '@core/actions/runner-error';
import { IWorkerRunnerExecutedAction } from '@core/actions/worker.actions';
import { RunnerErrorCode, RunnerErrorMessages } from '@core/errors/runners-errors';
import { PromisesResolver } from '@core/runner-promises';

export class NodeRunnerState {

    public executePromises = new PromisesResolver<IWorkerRunnerExecutedAction>();

    public destroy(): void {
        this.executePromises.promises.forEach(promise => {
            promise.reject({
                error: new Error(RunnerErrorMessages.RUNNER_WAS_DESTROYED),
                errorCode: RunnerErrorCode.RUNNER_WAS_DESTROYED,
                message: RunnerErrorMessages.RUNNER_WAS_DESTROYED,
            } as IRunnerError);
        });
    }
}
