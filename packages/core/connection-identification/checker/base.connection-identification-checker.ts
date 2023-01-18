import { IAction } from '../../types/action';
import { IDestroyTarget } from '../../types/targets/destroy-target';
import { EventHandlerController } from '../../utils/event-handler-controller';

export interface IConnectionIdentificationCheckerSplitAction<T extends IAction> {
    /** The action from which the connection identifier fields were removed */
    action: T;
    /** Checking that the action contains the expected identifier of the current connection */
    isMatched: boolean;
}

export  interface IBaseConnectionIdentificationChecker extends IDestroyTarget {
    readonly destroyHandlerController: EventHandlerController<void>;

    /** Attaching fields with a connection identifier for each action before sending */
    attachIdentifier(action: IAction): void;
    /**
     * * Separates the connection identifier field from the received action
     * * Checking if the action belongs to the current connection
     * using the received connection identifier that was attached to the action on the host side
     */
    splitIdentifier<T extends IAction>(action: T): IConnectionIdentificationCheckerSplitAction<T>;
}
