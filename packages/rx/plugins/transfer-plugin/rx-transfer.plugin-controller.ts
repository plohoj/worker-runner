import { ConnectionClosedError, ErrorSerializationPluginsResolver, ITransferPluginController, ITransferPluginControllerConfig, ITransferPluginControllerReceiveDataConfig, ITransferPluginControllerTransferDataConfig, ITransferPluginPreparedData, ITransferPluginReceivedData, ITransferPluginsResolverReceiveDataConfig, normalizeError, PLUGIN_CANNOT_PROCESS_DATA, ProxyConnectionChannel, TransferPluginReceivedData, TransferPluginSendData, TransferPluginsResolver, WorkerRunnerIdentifier, WorkerRunnerUnexpectedError } from '@worker-runner/core';
import { catchError, concatMap, defer, EMPTY, finalize, from, isObservable, map, merge, mergeMap, Observable, of, shareReplay, Subject, takeUntil, takeWhile, tap } from 'rxjs';
import { RxRunnerEmitError, RxSubscriptionNotFoundError } from '../../errors/runner-errors';
import { observeAction } from '../../utils/observe-action';
import { observeDestroy } from '../../utils/observe-destroy';
import { RX_TRANSFER_TYPE } from './rx-transfer-plugin-data';
import { IRxTransferPluginClientActions, IRxTransferPluginClientSubscribeAction, IRxTransferPluginClientUnsubscribeAction, RxTransferPluginClientAction } from './rx-transfer-plugin.client.actions';
import { IRxTransferPluginHostActions, IRxTransferPluginHostCompletedAction, IRxTransferPluginHostEmitAction, IRxTransferPluginHostErrorAction, RxTransferPluginHostAction } from './rx-transfer-plugin.host.actions';

// TODO Split implementation into client and host

export class RxTransferPluginController implements ITransferPluginController {
    private transferPluginsResolver!: TransferPluginsResolver;
    private errorSerialization!: ErrorSerializationPluginsResolver;

    public registerPluginConfig(config: ITransferPluginControllerConfig): void {
        this.transferPluginsResolver = config.transferPluginsResolver;
        this.errorSerialization = config.errorSerialization;
    }

    public transferData(
        config: ITransferPluginControllerTransferDataConfig
    ): ITransferPluginPreparedData | typeof PLUGIN_CANNOT_PROCESS_DATA {
        const observable = config.data as Observable<unknown>
        if (!isObservable(observable)) {
            return PLUGIN_CANNOT_PROCESS_DATA;
        }

        // TODO Need to process and send action RxTransferPluginHostAction.RX_NOT_FOUND

        const actionIdentifier = config.actionController.generateActionIdentifier();
        const proxyConnection = new ProxyConnectionChannel(
            config.actionController.connectionChannel,
            ['rxId', actionIdentifier],
        );
        let wasPreviouslySubscribed = false;
        const sendErrorEmit = (error: unknown) => {
            const errorAction: IRxTransferPluginHostErrorAction = {
                type: RxTransferPluginHostAction.RX_ERROR,
                error: this.errorSerialization.serializeError(
                    normalizeError(error, RxRunnerEmitError),
                ),
            }
            proxyConnection.sendAction(errorAction);
        }
        const destroySubject = new Subject<void>();

        observeAction<IRxTransferPluginClientActions>(proxyConnection).pipe(
            mergeMap(action => {
                switch (action.type) {
                    case RxTransferPluginClientAction.RX_SUBSCRIBE:
                        if (wasPreviouslySubscribed) {
                            throw new RxSubscriptionNotFoundError({
                                message: 'This Rx stream has already been subscribed before',
                            });
                        }
                        wasPreviouslySubscribed = true;

                        return observable.pipe(
                            concatMap(async (data: unknown) => {
                                const preparedData = await this.transferPluginsResolver.transferData({
                                    ...config,
                                    data,
                                });
                                const emitAction: IRxTransferPluginHostEmitAction = {
                                    type: RxTransferPluginHostAction.RX_EMIT,
                                    dataType: preparedData.type,
                                    data: preparedData.data,
                                }
                                if (!proxyConnection.isConnected) {
                                    await preparedData.cancel?.();
                                }
                                proxyConnection.sendAction(emitAction, preparedData.transfer)
                            }),
                            tap({
                                // TODO error was emitted twice? (see main catchError)
                                error: sendErrorEmit, // TODO Need to destroy the proxy connection?
                                complete: () => {
                                    const completeAction: IRxTransferPluginHostCompletedAction = {
                                        type: RxTransferPluginHostAction.RX_COMPLETED,
                                    }
                                    proxyConnection.sendAction(completeAction);
                                    destroySubject.next();
                                    destroySubject.complete();
                                }
                            }),
                        );
                    case RxTransferPluginClientAction.RX_UNSUBSCRIBE:
                        if (destroySubject.closed) {
                            throw new RxSubscriptionNotFoundError();
                        }
                        destroySubject.next();
                        destroySubject.complete();
                        return EMPTY;
                    default:
                        throw new WorkerRunnerUnexpectedError({
                            message: `Unexpected Action type "${(action as IRxTransferPluginClientActions).type}" for Rx transfer plugin`,
                        });
                }
            }),
            catchError(error => {
                if (config.actionController.connectionChannel.isConnected) {
                    sendErrorEmit(error);
                } else {
                    throw error;
                }
                return EMPTY;
            }),
            takeUntil(destroySubject),
            takeUntil(observeDestroy(config.actionController)),
            finalize(() => proxyConnection.destroy()),
        ).subscribe()
        proxyConnection.run();

        return {
            data: actionIdentifier satisfies WorkerRunnerIdentifier as unknown as TransferPluginSendData,
            type: RX_TRANSFER_TYPE,
        };
    }

    
    public receiveData(
        config: ITransferPluginControllerReceiveDataConfig,
    ): ITransferPluginReceivedData {
        const actionIdentifier = config.data satisfies TransferPluginSendData as unknown as WorkerRunnerIdentifier;
        const proxyConnection = new ProxyConnectionChannel(
            config.actionController.connectionChannel,
            ['rxId', actionIdentifier],
        );
        let wasPreviouslySubscribed = false;

        const observable = defer(() => {
            if (wasPreviouslySubscribed || !config.actionController.connectionChannel.isConnected) {
                throw new ConnectionClosedError();
            }
            wasPreviouslySubscribed = true;
            return merge(
                observeAction<IRxTransferPluginHostActions>(proxyConnection),
                observeDestroy(config.actionController).pipe(
                    tap(() => {
                        throw new ConnectionClosedError();
                    })
                ) as Observable<never>,
                defer(() => { // Send a subscribe action after the listen action has started
                    const subscribeAction: IRxTransferPluginClientSubscribeAction = {
                        type: RxTransferPluginClientAction.RX_SUBSCRIBE,
                    };
                    proxyConnection.run();
                    proxyConnection.sendAction(subscribeAction);
                    return EMPTY;
                }),
            )
        }) .pipe(
            takeWhile(action => action.type !== RxTransferPluginHostAction.RX_COMPLETED),
            concatMap(action => {
                switch (action.type) {
                    case RxTransferPluginHostAction.RX_EMIT: {
                        const receivedData$ = this.transferPluginsResolver.receiveData({
                            ...config,
                            type: action.dataType,
                            data: action.data,
                        })
                        if (receivedData$ instanceof Promise) {
                            return from(receivedData$).pipe(
                                map(receivedData => receivedData.data)
                            );
                        }
                        return of(receivedData$.data);
                    }
                    case RxTransferPluginHostAction.RX_ERROR: {
                        const deserializedError = this.errorSerialization.deserializeError(action.error);
                        throw deserializedError;
                    }
                    case RxTransferPluginHostAction.RX_NOT_FOUND:
                        throw new RxSubscriptionNotFoundError();
                    default:
                        throw new WorkerRunnerUnexpectedError({
                            message: `Unexpected Action type "${action.type}" for Rx transfer plugin`,
                        });
                }
            }),
            tap({
                unsubscribe: () => {
                    const unsubscribeAction: IRxTransferPluginClientUnsubscribeAction = {
                        type: RxTransferPluginClientAction.RX_UNSUBSCRIBE,
                    };
                    proxyConnection.sendAction(unsubscribeAction);
                }}
            ),
            tap({finalize: () => proxyConnection.destroy()}),
            shareReplay({refCount: true}),
        )

        return {
            data: observable satisfies Observable<TransferPluginReceivedData> as unknown as TransferPluginReceivedData,
        };
    }

    public cancelReceiveData(config: ITransferPluginsResolverReceiveDataConfig): void {
        // TODO implementation
    }

    public cancelTransferData?(
        config: ITransferPluginControllerTransferDataConfig,
    ): void | Promise<void> | typeof PLUGIN_CANNOT_PROCESS_DATA {
        // TODO implementation
    }
}

