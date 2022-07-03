import { IPreparedForSendRunnerAttachData } from '../base/base.connection-strategy-client';

export interface IMessageChannelConnectionPreparedForSendRunnerAttachData extends IPreparedForSendRunnerAttachData {
    port: MessagePort;
}
