import { IAction } from '../../../types/action';
import { IBaseConnectionIdentificationChecker } from '../../checker/base.connection-identification-checker';
import { DirectionConnectionIdentificationChecker } from '../../checker/direction.connection-identification-checker';
import { IBaseConnectionIdentificationStrategyClient } from '../base/base.connection-identification-strategy.client';
import { DirectionConnectionIdentifierDefaultEnum, DirectionConnectionIdentifierField, IDirectionConnectionIdentifierFields } from './direction-connection-identifier-fields';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { RunnerResolverHostBase } from '../../../runner-resolver/host/runner-resolver.host';

export interface IDirectionConnectionIdentificationStrategyClientConfig {
    clientIdentifier?: string;
    hostIdentifier?: string;
}

/**
 * This identification strategy is necessary:
 * * If the connection channel duplicates outgoing messages to incoming messages
 * (for example, window when using an iframe)
 * * If the connection channel transmits noise (stranger code messages)
 * (for example, browser extensions can use window to communicate with his own code)
 * * If the connection channel has more than one {@link RunnerResolverHostBase}
 * (In this case, you need to specify a custom connection direction identifier)
 */
export class DirectionConnectionIdentificationStrategyClient implements IBaseConnectionIdentificationStrategyClient {
    private readonly clientIdentifier: DirectionConnectionIdentifierField;
    private readonly hostIdentifier: DirectionConnectionIdentifierField;

    constructor(config?: IDirectionConnectionIdentificationStrategyClientConfig) {
        this.clientIdentifier = (
            config?.clientIdentifier || DirectionConnectionIdentifierDefaultEnum.Client
        ) satisfies string as unknown as DirectionConnectionIdentifierField;
        this.hostIdentifier = (
            config?.hostIdentifier || DirectionConnectionIdentifierDefaultEnum.Host
        ) satisfies string as unknown as DirectionConnectionIdentifierField;
    }

    public attachFirstIdentifier(action: IAction): void {
        (action as IAction & IDirectionConnectionIdentifierFields).from = this.clientIdentifier;
    }
    
    public checkIdentifier(action: IAction): IBaseConnectionIdentificationChecker | false {
        const isFromHost: boolean = (action as IAction & IDirectionConnectionIdentifierFields).from
            === this.hostIdentifier;
        if (!isFromHost) {
            return false;
        }
        return new DirectionConnectionIdentificationChecker({
            expectedDirection: this.hostIdentifier,
            attachDirection: this.clientIdentifier,
        });
    }
}
