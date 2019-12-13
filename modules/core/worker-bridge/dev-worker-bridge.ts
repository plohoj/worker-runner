import { IWorkerAction } from '@core/actions/worker-actions';
import { WorkerRunnerResolverBase } from '@core/resolver/worker-runner.resolver';
import { INodeAction } from '../actions/node-actions';
import { WorkerBridgeBase } from './worker-bridge-base';

export class DevWorkerBridge extends WorkerBridgeBase {
    constructor(private workerRunnerResolver: WorkerRunnerResolverBase<any>) {
        super();
        workerRunnerResolver.sendAction = this.handleWorkerAction.bind(this);
    }

    protected sendAction(action: INodeAction): void {
        this.workerRunnerResolver.handleAction(action);
    }

    public handleWorkerAction(action: IWorkerAction): void {
        super.handleWorkerAction(action);
    }
}
