import { INodeAction } from '@core/actions/node.actions';
import { WorkerRunnerResolverBase } from '@core/resolver/worker-runner.resolver';
import { Constructor } from '@core/types/constructor';
import { JsonObject } from '@core/types/json-object';
import { IRxNodeAction, RxNodeAction } from '../actions/node.actions';
import { RxRunnerState } from '../runner-state';

export class RxWorkerRunnerResolver<R extends Constructor<{[key: string]: any}>> extends WorkerRunnerResolverBase<R> {

    protected declare runnerStates: Map<number, RxRunnerState<R>>;
    protected declare execute: (action: INodeAction | IRxNodeAction) => Promise<void>;

    protected buildRunnerState(runnerConstructor: R, runnerArguments: JsonObject[]): RxRunnerState<R> {
        return new RxRunnerState({
            runnerConstructor,
            runnerArguments,
            workerRunnerResolver: this,
        });
    }

    public handleAction(action: INodeAction | IRxNodeAction): void {
        switch (action.type) {
            case RxNodeAction.RX_SUBSCRIBE:
            case RxNodeAction.RX_UNSUBSCRIBE:
                this.execute(action);
                break;
            default:
                super.handleAction(action);
                break;
        }
    }
}