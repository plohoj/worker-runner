import { RunnerDataTransferError } from '../../../errors/runner-errors';
import { TransferRunnerObject } from '../../../transfer-data/transfer-runner-object';
import { ErrorCollector } from '../../../utils/error-collector';
import { parallelPromises } from '../../../utils/parallel-promises';
import { PLUGIN_CANNOT_PROCESS_DATA } from "../../plugin-cannot-process-data";
import { ITransferPluginPreparedData, ITransferPluginReceivedData, TransferPluginCancelPreparedDataFunction, TransferPluginDataType, TransferPluginReceivedData, TransferPluginSendData } from '../base/transfer-plugin-data';
import { TransferPluginsResolver } from '../base/transfer-plugins.resolver';
import { ITransferPluginController, ITransferPluginControllerConfig, ITransferPluginControllerReceiveDataConfig, ITransferPluginControllerTransferDataConfig } from '../base/transfer.plugin-controller';
import { CollectionTransferData, ICollectionTransferPluginFieldData, ICollectionTransferPluginReceivedData, ICollectionTransferPluginSendData } from './collection-transfer-plugin-data';

function runnerDataTransferErrorFactory(originalErrors: unknown[]): RunnerDataTransferError {
    return new RunnerDataTransferError({originalErrors});
}

export abstract class BaseCollectionTransferPluginController<
    Input extends CollectionTransferData,
    Send extends ICollectionTransferPluginSendData,
    Received extends ICollectionTransferPluginReceivedData,
> implements ITransferPluginController {
    private transferPluginsResolver!: TransferPluginsResolver;
    
    protected abstract readonly type: TransferPluginDataType;

    public registerPluginConfig(config: ITransferPluginControllerConfig): void {
        this.transferPluginsResolver = config.transferPluginsResolver;
    }

    public transferData(
        config: ITransferPluginControllerTransferDataConfig
    ): Promise<ITransferPluginPreparedData> | typeof PLUGIN_CANNOT_PROCESS_DATA {
        if (!this.isCollectionData(config.data as TransferRunnerObject)) {
            return PLUGIN_CANNOT_PROCESS_DATA;
        }
        return this.transferDataAsync(config);
    }

    public cancelTransferData(
        config: ITransferPluginControllerTransferDataConfig,
    ): Promise<void> | typeof PLUGIN_CANNOT_PROCESS_DATA {
        if (!this.isCollectionData(config.data as TransferRunnerObject)) {
            return PLUGIN_CANNOT_PROCESS_DATA;
        }
        const iterator = this.getTransferDataIterator(config.data as Input);
        return parallelPromises({
            values: iterator,
            stopAtFirstError: false,
            mapper: data => this.transferPluginsResolver.cancelTransferData({
                actionController: config.actionController,
                data,
            }),
            errorCollector: new ErrorCollector(runnerDataTransferErrorFactory),
        }) as Promise<unknown> as Promise<void>
    }

    public async receiveData(
        config: ITransferPluginControllerReceiveDataConfig,
    ): Promise<ITransferPluginReceivedData> {
        const receivedDataFieldEntries = await this.collectFieldsReceivedData(config);

        const receivedDataCollection = this.getReceivedEmptyCollection();
        const cancelFunctions = new Array<TransferPluginCancelPreparedDataFunction>();
        for (const [fieldIdentifier, receivedData] of receivedDataFieldEntries) {
            this.setReceivedCollectionData(receivedDataCollection, fieldIdentifier, receivedData.data);
            if (receivedData.cancel) {
                cancelFunctions.push(receivedData.cancel);
            }
        }

        return {
            data: receivedDataCollection satisfies ICollectionTransferPluginReceivedData as unknown as TransferPluginReceivedData,
            cancel: this.generateCancelFunction(cancelFunctions),
        };
    }

    public cancelReceiveData(
        config: ITransferPluginControllerReceiveDataConfig,
    ): Promise<void> {
        const iterator = this.getReceivedDataIterator(config.data satisfies TransferPluginSendData as unknown as Send)
        return parallelPromises({
            values: iterator,
            stopAtFirstError: false,
            mapper: data => this.transferPluginsResolver.cancelReceiveData({
                actionController: config.actionController,
                type: data.type,
                data: data.data,
            }),
            errorCollector: new ErrorCollector(runnerDataTransferErrorFactory),
        }) as Promise<unknown> as Promise<void>;
    }

    private async transferDataAsync(
        config: ITransferPluginControllerTransferDataConfig
    ): Promise<ITransferPluginPreparedData> {
        const preparedDataFieldEntries = await this.collectFieldsPreparedData(config);

        const transfer = new Array<Transferable>();
        const cancelFunctions = new Array<TransferPluginCancelPreparedDataFunction>();
        const transferDataCollection = this.getTransferEmptyCollection();
        for (const [collectionIdentifier, preparedData] of preparedDataFieldEntries) {
            this.setTransferCollectionData(transferDataCollection, collectionIdentifier, {
                type: preparedData.type,
                data: preparedData.data,
            });
            transfer.push(...preparedData.transfer || []);
            if (preparedData.cancel) {
                cancelFunctions.push(preparedData.cancel);
            }
        }

        const preparedData: ITransferPluginPreparedData = {
            type: this.type,
            data: transferDataCollection satisfies ICollectionTransferPluginSendData as unknown as TransferPluginSendData,
            cancel: this.generateCancelFunction(cancelFunctions),
            transfer,
        };
        return preparedData;
    }

    private async collectFieldsPreparedData(config: ITransferPluginControllerTransferDataConfig) {
        const preparedData = await parallelPromises<
            [keyof Send, unknown],
            [keyof Send, ITransferPluginPreparedData]
        >({
            values: this.getTransferDataEntries(config.data as Input),
            stopAtFirstError: true,
            errorCollector: new ErrorCollector(runnerDataTransferErrorFactory),
            mapper: async ([collectionIdentifier, fieldValue]) => {
                const preparedData = await this.transferPluginsResolver.transferData({
                    ...config,
                    data: fieldValue,
                });
                return [collectionIdentifier, preparedData];
            },
            cancelMapped([, preparedData]) {
                return preparedData.cancel?.();
            },
            cancelRest: ([, fieldValue]) => {
                return this.transferPluginsResolver.cancelTransferData({
                    ...config,
                    data: fieldValue,
                })
            },
        });

        return preparedData;
    }

    private async collectFieldsReceivedData(config: ITransferPluginControllerReceiveDataConfig) {
        const preparedData = await parallelPromises<
            [keyof Received, ICollectionTransferPluginFieldData],
            [keyof Received, ITransferPluginReceivedData]
        >({
            values: this.getReceivedDataEntries(config.data satisfies ICollectionTransferPluginSendData as unknown as Send),
            stopAtFirstError: true,
            errorCollector: new ErrorCollector(runnerDataTransferErrorFactory),
            mapper: async ([collectionIdentifier, transferData]) => {
                const receivedData = await this.transferPluginsResolver.receiveData({
                    ...config,
                    data: transferData.data,
                    type: transferData.type,
                });
                return [collectionIdentifier, receivedData];
            },
            cancelMapped([, receivedData]) {
                return receivedData.cancel?.();
            },
            cancelRest: ([, fieldValue]) => {
                return this.transferPluginsResolver.cancelReceiveData({
                    ...config,
                    type: fieldValue.type,
                    data: fieldValue.data,
                })
            },
        });

        return preparedData;
    }

    private generateCancelFunction(cancelFunctions: TransferPluginCancelPreparedDataFunction[]): TransferPluginCancelPreparedDataFunction {
        return async function cancel(): Promise<void> {
            await parallelPromises({
                values: cancelFunctions,
                stopAtFirstError: false,
                mapper(cancelFunction) {
                    return cancelFunction();
                },
                errorCollector: new ErrorCollector(runnerDataTransferErrorFactory),
            });
        }
    }

    protected abstract isCollectionData(data: unknown): data is Input;

    protected abstract getTransferDataEntries(
        data: Input,
    ): Iterable<[keyof Send, unknown]>;
    protected abstract getTransferDataIterator(
        data: Input,
    ): Iterable<unknown>;
    protected abstract getTransferEmptyCollection(): Send;
    protected abstract setTransferCollectionData(
        collection: Send,
        field: keyof Send,
        data: ICollectionTransferPluginFieldData,
    ): void;

    protected abstract getReceivedDataEntries(
        data: Send
    ): Iterable<[keyof Received, ICollectionTransferPluginFieldData]>;
    protected abstract getReceivedDataIterator(
        data: Send
    ): Iterable<ICollectionTransferPluginFieldData>;
    protected abstract getReceivedEmptyCollection(): Received;
    protected abstract setReceivedCollectionData(
        collection: Received,
        field: keyof Received,
        data: TransferPluginReceivedData,
    ): void;
}
