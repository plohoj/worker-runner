import { RunnerConstructor, RunnerEnvironment , IRunnerMethodResult , IRunnerEnvironmentExecuteResultAction, TransferRunnerData, RunnerBridge, RUNNER_BRIDGE_CONTROLLER, TransferableJsonObject, IConnectEnvironmentConfig } from '@worker-runner/core';
import { Observable } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { RxConnectEnvironment } from '../../connect/environment/rx-connect.environment';
import { RxWorkerRunnerErrorCode } from '../../errors/error-code';
import { RX_WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-messages';
import { RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { RxRunnerEmitError } from '../../errors/runner-errors';
import { IRxRunnerSerializedMethodResult } from '../../types/resolved-runner';
import { IRxRunnerEnvironmentAction, IRxRunnerEnvironmentEmitAction, IRxRunnerEnvironmentEmitRunnerResultAction, RxRunnerEnvironmentAction } from './runner-environment.actions';

export class RxRunnerEnvironment<R extends RunnerConstructor> extends RunnerEnvironment<R> {
    protected readonly errorSerializer = RX_WORKER_RUNNER_ERROR_SERIALIZER;
    declare protected readonly connectEnvironment: RxConnectEnvironment;

    protected async handleExecuteResponse(
        executeResult: IRunnerMethodResult,
    ): Promise<IRunnerEnvironmentExecuteResultAction> {
        if (executeResult instanceof Observable) {
            return executeResult.pipe(
                mergeMap(this.mapRxEmit),
                catchError(this.mapRxError.bind(this)),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ) as any;
        }
        return super.handleExecuteResponse(executeResult);
    }

    protected connectEnvironmentFactory(config: IConnectEnvironmentConfig): RxConnectEnvironment {
        return new RxConnectEnvironment(config);
    }

    private async mapRxEmit(
        this: never,
        responseWithTransferData: IRunnerMethodResult
    ): Promise<IRxRunnerEnvironmentAction> {
        let response: IRxRunnerSerializedMethodResult;
        const transferable = new Array<Transferable>();
        if (responseWithTransferData instanceof TransferRunnerData) {
            transferable.push(...responseWithTransferData.transfer);
            response = responseWithTransferData.data;
        } else {
            response = responseWithTransferData;
        }
        if (RunnerBridge.isRunnerBridge(response)) { // TODO Code is duplicated
            const runnerController = await (response as RunnerBridge)[RUNNER_BRIDGE_CONTROLLER];
            const transferPort: MessagePort =  await runnerController.resolveOrTransferControl();
            const runnerResultAction: IRxRunnerEnvironmentEmitRunnerResultAction = {
                type: RxRunnerEnvironmentAction.RX_EMIT_RUNNER_RESULT,
                runnerId: runnerController.runnerId,
                port: transferPort,
                transfer: [transferPort],
            }
            return runnerResultAction;
        } else {
            const emitAction: IRxRunnerEnvironmentEmitAction = {
                type: RxRunnerEnvironmentAction.RX_EMIT,
                response: response as TransferableJsonObject,
                transfer: transferable
            }
            return emitAction;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async mapRxError(error: any): Promise<never> {
        const serializedError = this.errorSerializer.serialize(error, {
            errorCode: RxWorkerRunnerErrorCode.ERROR_EMIT,
            message: RX_WORKER_RUNNER_ERROR_MESSAGES.EMITTED_ERROR({runnerName: this.runnerName}),
            name: RxRunnerEmitError.name,
            stack: error?.stack || new Error().stack,
        });
        throw serializedError;
    }
}
