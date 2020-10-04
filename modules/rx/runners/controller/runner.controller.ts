import { IConnectControllerConfig, IRunnerParameter, RunnerConstructor, RunnerController, IRunnerSerializedMethodResult, IRunnerEnvironmentExecuteResultAction, WorkerRunnerUnexpectedError, WorkerRunnerError } from '@worker-runner/core';
import { Observable } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { RxConnectController } from '../../connect/controller/rx-connect.controller';
import { RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { IRxRunnerEnvironmentAction, RxRunnerEnvironmentAction } from '../environment/runner-environment.actions';

export class RxRunnerController<R extends RunnerConstructor> extends RunnerController<R> {

    protected readonly errorSerializer = RX_WORKER_RUNNER_ERROR_SERIALIZER;
    protected declare readonly connectController: RxConnectController;

    public async execute(
        methodName: string,
        args: IRunnerParameter[],
    ): Promise<IRunnerSerializedMethodResult> {
        const response = await super.execute(methodName, args);
        if (response instanceof Observable) {
            return response.pipe(
                mergeMap(this.mapRxEmit.bind(this)),
                catchError(this.mapRxError.bind(this)),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ) as any;
        }
        return response;
    }

    protected handleExecuteResult(
        actionResult: IRunnerEnvironmentExecuteResultAction | Observable<unknown>
    ): IRunnerSerializedMethodResult {
        if (actionResult instanceof Observable) {
            return actionResult as unknown as IRunnerSerializedMethodResult;
        }
        return super.handleExecuteResult(actionResult);
    }

    protected buildConnectController(config: IConnectControllerConfig): RxConnectController {
        return new RxConnectController(config);
    }

    private async mapRxEmit(
        action: IRxRunnerEnvironmentAction
    ): Promise<IRunnerSerializedMethodResult> {
        switch (action.type) {
            case RxRunnerEnvironmentAction.RX_EMIT:
                return action.response;
            case RxRunnerEnvironmentAction.RX_EMIT_RUNNER_RESULT:
                return this.runnerControllerPartFactory({
                    runnerId: action.runnerId,
                    port: action.port}
                ).resolvedRunner;
            default:
                throw new WorkerRunnerUnexpectedError({
                    message: 'Unexpected action type was emitted in Runner controller via Rx Observable',
                });
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async mapRxError(error: any): Promise<never> {
        if (error instanceof WorkerRunnerError) {
            throw error;
        }
        const serializedError = this.errorSerializer.deserialize(error);
        throw serializedError;
    }
}
