import { IAction } from '../../../types/action';
import { IBaseConnectionIdentificationChecker } from '../../checker/base.connection-identification-checker';

export interface IBaseConnectionIdentificationStrategyClient {
    /**
     * Attach connection identifier fields for the first action
     * that establishes the connection and uses a test identifier
     * that can be replaced on the host side
     */
    attachFirstIdentifier(action: IAction): void;
    /**
     * After sending the test connection identifier that was attached to the action,
     * the host can either keep the suggested connection identifier or change it to another one.
     * If necessary, update the current connection identifier
     * @returns
     * * An instance of a class that allows to check that the action belongs to the current connection
     * * The value `false`, which means that the action does not belong to the current connection
     */
    checkIdentifier(action: IAction): IBaseConnectionIdentificationChecker | false;
}
