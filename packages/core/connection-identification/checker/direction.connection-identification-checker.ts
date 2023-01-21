import { IAction } from '../../types/action';
import { EventHandlerController } from '../../utils/event-handler-controller';
import { DirectionConnectionIdentifierField, IDirectionConnectionIdentifierFields } from '../strategy/direction/direction-connection-identifier-fields';
import { IBaseConnectionIdentificationChecker, IConnectionIdentificationCheckerSplitAction } from './base.connection-identification-checker';

export interface IDirectionConnectionIdentificationCheckerConfig {
    expectedDirection: DirectionConnectionIdentifierField;
    attachDirection: DirectionConnectionIdentifierField;
}

export class DirectionConnectionIdentificationChecker implements IBaseConnectionIdentificationChecker {
    public readonly attachDirection: DirectionConnectionIdentifierField;
    public readonly expectedDirection: DirectionConnectionIdentifierField;
    public readonly destroyHandlerController = new EventHandlerController<void>();

    constructor(config: IDirectionConnectionIdentificationCheckerConfig) {
        this.expectedDirection = config.expectedDirection;
        this.attachDirection = config.attachDirection;
    }

    public attachIdentifier(action: IAction): void {
        (action as IAction & IDirectionConnectionIdentifierFields).from = this.attachDirection;
    }

    public splitIdentifier<T extends IAction>(action: T): IConnectionIdentificationCheckerSplitAction<T> {
        const {from, ...originalAction} = (action as T & IDirectionConnectionIdentifierFields);
        return {
            action: originalAction as unknown as T,
            isMatched: from === this.expectedDirection,
        }
    }

    public destroy(): void {
        this.destroyHandlerController.dispatch();
        this.destroyHandlerController.clear();
    }
}
