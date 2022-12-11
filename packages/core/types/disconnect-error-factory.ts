import { ConnectionClosedError } from '../errors/runner-errors';

export type DisconnectErrorFactory = () => ConnectionClosedError;
