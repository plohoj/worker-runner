import { RunnerConstructor, RunnerEnvironmentHost , IRunnerMethodResult , IRunnerEnvironmentHostExecuteResultAction, TransferRunnerData, RunnerBridge, RUNNER_BRIDGE_CONTROLLER, TransferableJsonObject, IConnectHostConfig, RunnerIdentifierConfigList, IRunnerEnvironmentClientCollectionConfig, IConnectCustomAction } from '@worker-runner/core';
import { Observable } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { RxConnectHost } from '../../connect/host/rx-connect.host';
import { RX_WORKER_RUNNER_ERROR_MESSAGES } from '../../errors/error-messages';
import { RX_WORKER_RUNNER_ERROR_SERIALIZER } from '../../errors/error.serializer';
import { RxRunnerEmitError } from '../../errors/runner-errors';
import { IRxRunnerSerializedMethodResult } from '../../runners/resolved-runner';
import { RxRunnerEnvironmentClientCollection } from '../client/runner-environment.client.collection';
import { IRxRunnerEnvironmentHostAction, IRxRunnerEnvironmentHostEmitAction, IRxRunnerEnvironmentHostEmitRunnerResultAction, RxRunnerEnvironmentHostAction } from './runner-environment.host.actions';

export class RxRunnerEnvironmentHost<R extends RunnerConstructor> extends RunnerEnvironmentHost<R> {
    protected override readonly errorSerializer = RX_WORKER_RUNNER_ERROR_SERIALIZER;

    protected override async handleExecuteResponse(
        executeResult: IRunnerMethodResult,
    ): Promise<IRunnerEnvironmentHostExecuteResultAction> {
        if (executeResult instanceof Observable) {
            return executeResult.pipe(
                mergeMap(this.mapRxEmit),
                catchError(this.mapRxError.bind(this)),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ) as any;
        }
        return super.handleExecuteResponse(executeResult);
    }

    protected override buildConnectHost<
        I extends IConnectCustomAction,
        O extends IConnectCustomAction
    >(config: IConnectHostConfig<I, O>): RxConnectHost<I, O> {
        return new RxConnectHost(config);
    }

    protected override buildRunnerEnvironmentClientCollection(
        config: IRunnerEnvironmentClientCollectionConfig<RunnerIdentifierConfigList>
    ): RxRunnerEnvironmentClientCollection<RunnerIdentifierConfigList> {
        return new RxRunnerEnvironmentClientCollection(config);
    }

    private async mapRxEmit(
        this: never,
        responseWithTransferData: IRunnerMethodResult
    ): Promise<IRxRunnerEnvironmentHostAction> {
        let response: IRxRunnerSerializedMethodResult;
        const transferable = new Array<Transferable>();
        if (responseWithTransferData instanceof TransferRunnerData) {
            transferable.push(...responseWithTransferData.transfer);
            response = responseWithTransferData.data;
        } else {
            response = responseWithTransferData;
        }
        if (RunnerBridge.isRunnerBridge(response)) {
            const runnerEnvironmentClient = await (response as RunnerBridge)[RUNNER_BRIDGE_CONTROLLER];
            const transferPort: MessagePort =  await runnerEnvironmentClient.resolveOrTransferControl();
            const runnerResultAction: IRxRunnerEnvironmentHostEmitRunnerResultAction = {
                type: RxRunnerEnvironmentHostAction.RX_EMIT_RUNNER_RESULT,
                token: runnerEnvironmentClient.token,
                port: transferPort,
                transfer: [transferPort],
            }
            return runnerResultAction;
        } else {
            const emitAction: IRxRunnerEnvironmentHostEmitAction = {
                type: RxRunnerEnvironmentHostAction.RX_EMIT,
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
