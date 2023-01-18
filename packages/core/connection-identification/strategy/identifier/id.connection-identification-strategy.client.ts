import { IAction } from '../../../types/action';
import { IdentifierGenerator, WorkerRunnerIdentifier } from '../../../utils/identifier-generator';
import { IBaseConnectionIdentificationChecker } from '../../checker/base.connection-identification-checker';
import { IdConnectionIdentificationChecker } from '../../checker/id.connection-identification-checker';
import { IBaseConnectionIdentificationStrategyClient } from '../base/base.connection-identification-strategy.client';
import { ConnectionIdentifier, IIdConnectionIdentifierNewFields, IIdConnectionIdentifierReplacedFields } from './id-connection-identifier-fields';

export interface IdConnectionIdentificationStrategyClientConfig {
    identifierGenerator?: IdentifierGenerator;
}

export class IdConnectionIdentificationStrategyClient implements IBaseConnectionIdentificationStrategyClient {

    private identifier: ConnectionIdentifier;

    constructor(config?: IdConnectionIdentificationStrategyClientConfig) {
        const identifierGenerator = config?.identifierGenerator || new IdentifierGenerator();
        this.identifier = identifierGenerator
            .generate() satisfies WorkerRunnerIdentifier as unknown as ConnectionIdentifier;
    }

    public attachFirstIdentifier(action: IAction): void {
        (action as IAction & IIdConnectionIdentifierNewFields).newConnectionId = this.identifier;
    }
    
    public checkIdentifier(action: IAction): IBaseConnectionIdentificationChecker | false {
        const {connectionId, oldConnectionId} = (action as IAction & IIdConnectionIdentifierReplacedFields);
        if (oldConnectionId === this.identifier) {
            this.identifier = connectionId;
        } else if (connectionId !== this.identifier) {
            return false;
        }
        return new IdConnectionIdentificationChecker({ identifier: this.identifier });
    }
}
