import { INodeAction, IWorkerAction, IWorkerDestroyedAction } from '@worker-runner/core';
import { IRxNodeAction } from '../actions/node.actions';
import { RxWorkerRunnerResolver } from '../resolvers/worker-runner.resolver';
import { RxWorkerBridge } from '../worker-bridge';

export class RxDevWorkerBridge extends RxWorkerBridge {
    constructor(private workerRunnerResolver: RxWorkerRunnerResolver<any>) {
        super({workerName: 'Dev worker', workerPath: 'virtual'});
        workerRunnerResolver.sendAction = this.handleWorkerAction.bind(this);
    }

    /** @deprecated No need to call in development mode */
    public async init(): Promise<void> {
        // Nothing to do
    }

    public sendAction(action: INodeAction | IRxNodeAction): void {
        this.workerRunnerResolver.handleAction(action);
    }

    public handleWorkerAction(action: IWorkerAction): void {
        super.handleWorkerAction(action);
    }

    public async destroy(force = false): Promise<IWorkerDestroyedAction> {
        const destroyResult: IWorkerDestroyedAction = await this.sendDestroy(force);
        this.destroyRunnerState();
        return destroyResult;
    }
}
