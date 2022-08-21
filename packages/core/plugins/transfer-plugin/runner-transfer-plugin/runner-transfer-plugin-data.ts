import { RunnerToken } from '../../../types/runner-identifier';
import { TransferPluginDataType } from '../base/transfer-plugin-data';

export const RUNNER_TRANSFER_TYPE = 'RUNNER' as TransferPluginDataType;

export interface IRunnerTransferPluginData {
    token: RunnerToken;
}