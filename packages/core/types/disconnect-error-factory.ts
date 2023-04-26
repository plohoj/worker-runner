import { DisconnectReason } from '../connections/base/disconnect-reason';
import { ConnectionClosedError } from '../errors/runner-errors';

export interface IDisconnectErrorFactoryOptions {
    disconnectReason: DisconnectReason
}

export type DisconnectErrorFactory = (options: IDisconnectErrorFactoryOptions) => ConnectionClosedError;
