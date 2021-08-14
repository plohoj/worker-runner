import { RunnerConstructor, RunnerEnvironment , IRunnerMethodResult , IRunnerEnvironmentExecuteResultAction, TransferRunnerData, RunnerBridge, RUNNER_BRIDGE_CONTROLLER, TransferableJsonObject, IConnectEnvironmentConfig, RunnerIdentifierConfigList, IRunnerControllerCollectionConfig, IConnectCustomAction } from '@worker-runner/core';
import { Observable } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { RxConnectEnvironment } from '../../connect/environment/rx-connect.environment';
import { RX_WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-messages';
import { RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { RxRunnerEmitError } from '../../errors/runner-errors';
import { RxRunnerControllerCollection } from '../controller/runner.controller.collection';
import { IRxRunnerSerializedMethodResult } from '../resolved-runner';
import { IRxRunnerEnvironmentAction, IRxRunnerEnvironmentEmitAction, IRxRunnerEnvironmentEmitRunnerResultAction, RxRunnerEnvironmentAction } from './runner-environment.actions';

export class RxRunnerEnvironment<R extends RunnerConstructor> extends RunnerEnvironment<R> {
    protected override readonly errorSerializer = RX_WORKER_RUNNER_ERROR_SERIALIZER;

    protected override async handleExecuteResponse(
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

    protected override buildConnectEnvironment<
        I extends IConnectCustomAction,
        O extends IConnectCustomAction
    >(config: IConnectEnvironmentConfig<I, O>): RxConnectEnvironment<I, O> {
        return new RxConnectEnvironment(config);
    }

    protected override buildRunnerControllerCollection(
        config: IRunnerControllerCollectionConfig<RunnerIdentifierConfigList>
    ): RxRunnerControllerCollection<RunnerIdentifierConfigList> {
        return new RxRunnerControllerCollection(config);
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
        if (RunnerBridge.isRunnerBridge(response)) {
            const runnerController = await (response as RunnerBridge)[RUNNER_BRIDGE_CONTROLLER];
            const transferPort: MessagePort =  await runnerController.resolveOrTransferControl();
            const runnerResultAction: IRxRunnerEnvironmentEmitRunnerResultAction = {
                type: RxRunnerEnvironmentAction.RX_EMIT_RUNNER_RESULT,
                token: runnerController.token,
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
        throw this.errorSerializer.normalize(error, RxRunnerEmitError, {
            message: RX_WORKER_RUNNER_ERROR_MESSAGES.EMITTED_ERROR(
                this.getErrorMessageConfig(),
            ),
        });
    }
}
