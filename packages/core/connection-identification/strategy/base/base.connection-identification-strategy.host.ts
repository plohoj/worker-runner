import { IAction } from '../../../types/action';
import { IBaseConnectionIdentificationChecker } from '../../checker/base.connection-identification-checker';

export interface IBaseConnectionIdentificationStrategyHost {
    /**
     * From the client side, an action came with the test connection identifier field.
     * Checks are made and if the proposed connection identifier does not satisfy,
     * then a new connection identifier will be generated.
     * The new or/and old connection identifier will be attached to the action
     * that will be sent in response to the client
     * @returns
     * * An instance of a class that allows to check that the action belongs to the current connection
     * * The value `false`, which means that the action did not pass the test and was rejected
     * (for example, an invalid action was received)
     */
    checkIdentifier(receivedAction: IAction, actionForSend: IAction): IBaseConnectionIdentificationChecker | false;
}
