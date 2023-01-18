import { IAction } from '../../../types/action';
import { IBaseConnectionIdentificationChecker } from '../../checker/base.connection-identification-checker';
import { ConnectionIdentificationCheckerComposer } from '../../checker/connection-identification-checker.composer';
import { IBaseConnectionIdentificationStrategyHost } from '../base/base.connection-identification-strategy.host';

export interface ConnectionIdentificationStrategyComposerHostConfig {
    identificationStrategies: IBaseConnectionIdentificationStrategyHost[];
}

export class ConnectionIdentificationStrategyComposerHost implements IBaseConnectionIdentificationStrategyHost {
    private readonly identificationStrategies: IBaseConnectionIdentificationStrategyHost[];

    constructor(config: ConnectionIdentificationStrategyComposerHostConfig) {
        this.identificationStrategies = config.identificationStrategies;
    }

    checkIdentifier(
        receivedAction: IAction,
        actionForSend: IAction,
    ): IBaseConnectionIdentificationChecker | false {
        const identificationCheckers: IBaseConnectionIdentificationChecker[] = [];
        for (const identificationStrategy of this.identificationStrategies) {
            const identificationChecker = identificationStrategy.checkIdentifier(receivedAction, actionForSend)
            if (!identificationChecker) {
                for (const identificationChecker of identificationCheckers) {
                    identificationChecker.destroy();
                }
                return false;
            }
            identificationCheckers.push(identificationChecker);
        }
        return new ConnectionIdentificationCheckerComposer({ identificationCheckers });
    }
}
