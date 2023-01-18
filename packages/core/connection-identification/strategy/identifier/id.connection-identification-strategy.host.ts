import { IAction } from '../../../types/action';
import { IdentifierGenerator, WorkerRunnerIdentifier } from '../../../utils/identifier-generator';
import { IBaseConnectionIdentificationChecker } from '../../checker/base.connection-identification-checker';
import { IdConnectionIdentificationChecker } from '../../checker/id.connection-identification-checker';
import { IBaseConnectionIdentificationStrategyHost } from '../base/base.connection-identification-strategy.host';
import { ConnectionIdentifier, IIdConnectionIdentifierNewFields, IIdConnectionIdentifierReplacedFields } from './id-connection-identifier-fields';

export interface IdConnectionIdentificationStrategyHostConfig {
    identifierGenerator?: IdentifierGenerator;
}

/**
 * WARNING: This identification method is not protected from data leakage during DDOS
 */
export class IdConnectionIdentificationStrategyHost implements IBaseConnectionIdentificationStrategyHost {
    private readonly connectedIdentifiersSet = new Set<ConnectionIdentifier>();
    private readonly identifierGenerator: IdentifierGenerator;

    
    constructor(config?: IdConnectionIdentificationStrategyHostConfig) {
        this.identifierGenerator = config?.identifierGenerator || new IdentifierGenerator();
    }

    checkIdentifier(
        receivedAction: IAction,
        actionForSend: IAction
    ): IBaseConnectionIdentificationChecker | false {
        const suggestedId = (receivedAction as IAction & IIdConnectionIdentifierNewFields).newConnectionId;
        if (suggestedId === undefined) {
            return false;
        }
        let connectionId = suggestedId;
        while (this.connectedIdentifiersSet.has(connectionId)) {
            connectionId = this.identifierGenerator
                .generate() satisfies WorkerRunnerIdentifier as unknown as ConnectionIdentifier;
        }
        this.connectedIdentifiersSet.add(connectionId);
        (actionForSend as IAction & IIdConnectionIdentifierReplacedFields).connectionId = connectionId;
        if (suggestedId !== connectionId) {
            (actionForSend as IAction & IIdConnectionIdentifierReplacedFields).oldConnectionId = suggestedId;
        }
        const identificationChecker = new IdConnectionIdentificationChecker({ identifier: connectionId });
        identificationChecker.destroyHandlerController.addHandler(() => this.connectedIdentifiersSet.delete(connectionId));
        return identificationChecker;
    }
}
