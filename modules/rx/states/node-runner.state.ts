import { IRunnerError } from '@core/actions/runner-error';
import { RunnerErrorCode, RunnerErrorMessages } from '@core/errors/runners-errors';
import { NodeRunnerState } from '@core/state/node-runner.state';
import { JsonObject } from '@core/types/json-object';
import { Subscriber } from 'rxjs';

export class RxNodeRunnerState extends NodeRunnerState {
    /** {actionId: Subscriber} */
    public readonly subscribers$ = new Map<number, Subscriber<JsonObject>>();

    public destroy(): void {
        this.subscribers$.forEach(subscriber => {
            subscriber.error({
                error: new Error(RunnerErrorMessages.RUNNER_WAS_DESTROYED),
                message: RunnerErrorMessages.RUNNER_WAS_DESTROYED,
                errorCode: RunnerErrorCode.RUNNER_WAS_DESTROYED,
            } as IRunnerError);
            subscriber.complete();
        });
        this.subscribers$.clear();
        super.destroy();
    }
}
