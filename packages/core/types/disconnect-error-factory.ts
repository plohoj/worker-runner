import { ConnectionWasClosedError } from '../errors/runner-errors';

export type DisconnectErrorFactory = (error: ConnectionWasClosedError) => ConnectionWasClosedError;
