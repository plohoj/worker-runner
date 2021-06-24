import { ConnectController, IConnectEnvironmentAction, IConnectEnvironmentActions, ConnectionWasClosedError, WorkerRunnerUnexpectedError, PromiseListResolver } from "@worker-runner/core";
import { Observable, Subscriber } from "rxjs";
import { publish, refCount } from "rxjs/operators";
import { RxSubscriptionNotFoundError } from "../../errors/runner-errors";
import { IRxConnectEnvironmentActionPropertiesRequirements, IRxConnectEnvironmentActions, IRxConnectEnvironmentCompletedAction, IRxConnectEnvironmentEmitAction, IRxConnectEnvironmentErrorAction, IRxConnectEnvironmentInitAction, IRxConnectEnvironmentNotFoundAction, RxConnectEnvironmentAction } from "../environment/rx-connect-environment.actions";
import { IRxConnectControllerActionPropertiesRequirements, IRxConnectControllerUnsubscribeAction, RxConnectControllerAction  } from "./rx-connect-controller.actions";

/** **WARNING**: Errors emits as is, need use pipe for deserialize */
export class RxConnectController extends ConnectController {    
    declare public sendAction: <
        O extends IRxConnectControllerActionPropertiesRequirements<O>,
        I extends IRxConnectEnvironmentActionPropertiesRequirements<I>
            | Observable<IRxConnectEnvironmentActionPropertiesRequirements<I>>,
    >(action: O) => Promise<I>;

    declare protected readonly promiseListResolver: PromiseListResolver<IConnectEnvironmentAction | Observable<IConnectEnvironmentAction>>;
    /** List of action ids that can subscribe to */
    private readonly canSubscribedList = new Set<number>();
     /** {actionId: Subscriber} */
     private readonly subscribersMap = new Map<number, Subscriber<IConnectEnvironmentAction>>();

    public override stopListen(isClosePort?: boolean): void {
        this.disconnectStatus ||= this.disconnectErrorFactory(new ConnectionWasClosedError());
        for (const subscriber of this.subscribersMap.values()) {
            subscriber.error(this.disconnectStatus);
            subscriber.complete();
        }
        this.subscribersMap.clear();
        this.canSubscribedList.clear();
        super.stopListen(isClosePort);
    }

    protected override handleAction(
        actionWithId:
            | IConnectEnvironmentAction
            | IConnectEnvironmentActions
            | IRxConnectEnvironmentActions
    ): void {
        switch ((actionWithId as IRxConnectEnvironmentActions).type) {
            case RxConnectEnvironmentAction.RX_INIT:
                this.runnerObservableInit(actionWithId as IRxConnectEnvironmentInitAction);
                break;
            case RxConnectEnvironmentAction.RX_EMIT:
                this.runnerObservableEmit(actionWithId as IRxConnectEnvironmentEmitAction);
                break;
            case RxConnectEnvironmentAction.RX_ERROR:
                this.runnerObservableError(actionWithId as IRxConnectEnvironmentErrorAction);
                break;
            case RxConnectEnvironmentAction.RX_COMPLETED:
                this.runnerObservableCompleted(actionWithId as IRxConnectEnvironmentCompletedAction);
                break;
            case RxConnectEnvironmentAction.RX_NOT_FOUND:
                this.runnerObservableNotFound(actionWithId as IRxConnectEnvironmentNotFoundAction);
                break;
            default:
                super.handleAction(actionWithId as IConnectEnvironmentAction | IConnectEnvironmentActions);
                break;
        }
    }

    private runnerObservableInit(action: IRxConnectEnvironmentInitAction): void {
        const observable = new Observable<IConnectEnvironmentAction>(subscriber => {
            if (!this.canSubscribedList.has(action.id)) {
                if (this.disconnectStatus) {
                    subscriber.error(this.disconnectStatus);
                } else {
                    subscriber.error(this.disconnectErrorFactory(new WorkerRunnerUnexpectedError()));
                }
                subscriber.complete();
                return;
            }
            this.subscribersMap.set(action.id, subscriber);
            this.canSubscribedList.delete(action.id)
            this.port.postMessage({
                type: RxConnectControllerAction.RX_SUBSCRIBE,
                id: action.id,
            });
            return () => { // TODO check that the method is called after observable unsubscribe
                // TODO place permanent error message about subscribe listener has been disconnected
                const unsubscribeAction: IRxConnectControllerUnsubscribeAction = { // TODO check work
                    type: RxConnectControllerAction.RX_UNSUBSCRIBE,
                    id: action.id,
                }
                this.port.postMessage(unsubscribeAction);
            };
        }).pipe(
            publish(),
            refCount(),
        );
        this.canSubscribedList.add(action.id);
        this.promiseListResolver.resolve(
            action.id,
            observable,
        );
    }

    private runnerObservableEmit(action: IRxConnectEnvironmentEmitAction): void {
        this.getSubscriber(action.id).next(action.response as IConnectEnvironmentAction);
    }

    private runnerObservableError(action: IRxConnectEnvironmentErrorAction): void {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        this.getSubscriber(action.id).error(action.error);
    }

    private runnerObservableCompleted(action: IRxConnectEnvironmentCompletedAction): void {
        this.getSubscriber(action.id).complete();
        this.subscribersMap.delete(action.id);
    }

    private runnerObservableNotFound(action: IRxConnectEnvironmentNotFoundAction): void {
        const subscriber =  this.getSubscriber(action.id);
        subscriber.error(new RxSubscriptionNotFoundError()); // TODO need test
        subscriber.complete();
        this.subscribersMap.delete(action.id);
    }

    private getSubscriber(actionId: number): Subscriber<IConnectEnvironmentAction> {
        const completedSubscriber$ = this.subscribersMap.get(actionId);
        if (!completedSubscriber$) {
            throw new RxSubscriptionNotFoundError();
        }
        return completedSubscriber$;
    }
}
