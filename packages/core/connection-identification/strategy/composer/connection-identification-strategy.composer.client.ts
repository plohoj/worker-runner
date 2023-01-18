import { IAction } from '../../../types/action';
import { IBaseConnectionIdentificationChecker } from '../../checker/base.connection-identification-checker';
import { ConnectionIdentificationCheckerComposer } from '../../checker/connection-identification-checker.composer';
import { IBaseConnectionIdentificationStrategyClient } from '../base/base.connection-identification-strategy.client';

export interface IConnectionIdentificationStrategyComposerClient {
    identificationStrategies: IBaseConnectionIdentificationStrategyClient[];
}

export class ConnectionIdentificationStrategyComposerClient implements IBaseConnectionIdentificationStrategyClient {
    private readonly identificationStrategies: IBaseConnectionIdentificationStrategyClient[];

    constructor(config: IConnectionIdentificationStrategyComposerClient) {
        this.identificationStrategies = config.identificationStrategies;
    }

    public attachFirstIdentifier(action: IAction): void {
        for (const identificationStrategy of this.identificationStrategies) {
            identificationStrategy.attachFirstIdentifier(action);
        }
    }
    
    public checkIdentifier(action: IAction): IBaseConnectionIdentificationChecker | false {
        const identificationCheckers: IBaseConnectionIdentificationChecker[] = [];
        for (const identificationStrategy of this.identificationStrategies) {
            const identificationChecker = identificationStrategy.checkIdentifier(action)
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
