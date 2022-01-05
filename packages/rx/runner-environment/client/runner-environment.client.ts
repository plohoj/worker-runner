import { IConnectClientConfig, IRunnerParameter, RunnerConstructor, RunnerEnvironmentClient, IRunnerSerializedMethodResult, IRunnerEnvironmentHostExecuteResultAction, WorkerRunnerUnexpectedError, WorkerRunnerError } from '@worker-runner/core';
import { Observable } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { RxConnectClient } from '../../connect/client/rx-connect.client';
import { RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { IRxRunnerEnvironmentHostAction, RxRunnerEnvironmentHostAction } from '../host/runner-environment.host.actions';

export class RxRunnerEnvironmentClient<R extends RunnerConstructor> extends RunnerEnvironmentClient<R> {

    protected override readonly errorSerializer = RX_WORKER_RUNNER_ERROR_SERIALIZER;
    protected declare readonly connectClient: RxConnectClient;

    public override async execute(
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

    protected override async handleExecuteResult(
        actionResult: IRunnerEnvironmentHostExecuteResultAction | Observable<unknown>
    ): Promise<IRunnerSerializedMethodResult> {
        if (actionResult instanceof Observable) {
            return actionResult as unknown as IRunnerSerializedMethodResult;
        }
        return super.handleExecuteResult(actionResult);
    }

    protected override buildConnectClient(config: IConnectClientConfig): RxConnectClient {
        return new RxConnectClient(config);
    }

    private async mapRxEmit(
        action: IRxRunnerEnvironmentHostAction
    ): Promise<IRunnerSerializedMethodResult> {
        switch (action.type) {
            case RxRunnerEnvironmentHostAction.RX_EMIT:
                return action.response;
            case RxRunnerEnvironmentHostAction.RX_EMIT_RUNNER_RESULT: {
                const runnerEnvironmentClient = await this.runnerEnvironmentClientPartFactory({
                    token: action.token,
                    port: action.port,
                });
                return runnerEnvironmentClient.resolvedRunner;
            }
            default:
                throw new WorkerRunnerUnexpectedError({
                    message: 'Unexpected action type was emitted in RxRunnerEnvironmentClient via Rx Observable',
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
