import { IAction } from '../../types/action';
import { EventHandlerController } from '../../utils/event-handler-controller';
import { IBaseConnectionIdentificationChecker, IConnectionIdentificationCheckerSplitAction } from './base.connection-identification-checker';

export interface IConnectionIdentificationCheckerComposerConfig {
    identificationCheckers: IBaseConnectionIdentificationChecker[];
}

export class ConnectionIdentificationCheckerComposer implements IBaseConnectionIdentificationChecker {
    public readonly identificationCheckers: IBaseConnectionIdentificationChecker[];
    public readonly destroyHandlerController = new EventHandlerController<void>();

    constructor(config: IConnectionIdentificationCheckerComposerConfig) {
        this.identificationCheckers = config.identificationCheckers
    }

    public attachIdentifier(action: IAction): void {
        for (const identificationChecker of this.identificationCheckers) {
            identificationChecker.attachIdentifier(action);
        }
    }

    public splitIdentifier<T extends IAction>(action: T): IConnectionIdentificationCheckerSplitAction<T> {
        let originalAction: T = action;
        let isMatched = true;
        for (const identificationChecker of this.identificationCheckers) {
            const splitActionCheck = identificationChecker.splitIdentifier(action);
            isMatched = isMatched && splitActionCheck.isMatched;
            originalAction = splitActionCheck.action;
        }
        return {
            action: originalAction,
            isMatched: isMatched,
        }
    }

    public destroy(): void {
        for (const identificationChecker of this.identificationCheckers) {
            identificationChecker.destroy();
        }
        this.destroyHandlerController.dispatch();
        this.destroyHandlerController.clear();
    }
}
