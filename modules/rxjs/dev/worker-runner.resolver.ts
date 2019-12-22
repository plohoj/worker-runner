import { IWorkerAction } from '@core/actions/worker.actions';
import { Constructor } from '@core/types/constructor';
import { RxWorkerRunnerResolver } from '../resolvers/worker-runner.resolver';
import { RxDevWorkerBridge } from './dev-worker-bridge';

export class RxDevWorkerRunnerResolver<R extends Constructor<{[key: string]: any}>> extends RxWorkerRunnerResolver<R> {
    public workerBridge = new RxDevWorkerBridge(this);

    public sendAction(action: IWorkerAction): void {
        this.workerBridge.handleWorkerAction(action);
    }
}
