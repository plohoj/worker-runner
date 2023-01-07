import { RunnerToken } from '../../../types/runner-identifier';
import { TransferPluginDataType } from '../base/transfer-plugin-data';

export const RUNNER_TRANSFER_TYPE = 'RUNNER' satisfies string as unknown as TransferPluginDataType;

export interface IRunnerTransferPluginData {
    token: RunnerToken;
}
