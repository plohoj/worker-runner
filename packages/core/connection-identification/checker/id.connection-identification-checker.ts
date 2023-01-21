import { IAction } from '../../types/action';
import { EventHandlerController } from '../../utils/event-handler-controller';
import { ConnectionIdentifier, IIdConnectionIdentifierFields } from '../strategy/identifier/id-connection-identifier-fields';
import { IBaseConnectionIdentificationChecker, IConnectionIdentificationCheckerSplitAction } from './base.connection-identification-checker';

export interface IIdConnectionIdentificationCheckerConfig {
    identifier: ConnectionIdentifier;
}

export class IdConnectionIdentificationChecker implements IBaseConnectionIdentificationChecker {
    public readonly identifier: ConnectionIdentifier;
    public readonly destroyHandlerController = new EventHandlerController<void>();

    constructor(config: IIdConnectionIdentificationCheckerConfig) {
        this.identifier = config.identifier;
    }

    public attachIdentifier(action: IAction): void {
        (action as IAction & IIdConnectionIdentifierFields).connectionId = this.identifier;
    }

    public splitIdentifier<T extends IAction>(action: T): IConnectionIdentificationCheckerSplitAction<T> {
        const {connectionId, ...originalAction} = (action as T & IIdConnectionIdentifierFields);
        return {
            action: originalAction as unknown as T,
            isMatched: connectionId === this.identifier,
        }
    }

    public destroy(): void {
        this.destroyHandlerController.dispatch();
        this.destroyHandlerController.clear();
    }
}
