import { ConnectController, IConnectEnvironmentActions, ConnectionWasClosedError, WorkerRunnerUnexpectedError, IConnectCustomAction, IConnectEnvironmentCustomResponseAction, ConnectEnvironmentAction } from "@worker-runner/core";
import { Observable, Subscriber } from "rxjs";
import { share } from "rxjs/operators";
import { RxSubscriptionNotFoundError } from "../../errors/runner-errors";
import { IRxConnectEnvironmentActions, IRxConnectEnvironmentCompletedAction, IRxConnectEnvironmentEmitAction, IRxConnectEnvironmentErrorAction, IRxConnectEnvironmentInitAction, IRxConnectEnvironmentNotFoundAction, RxConnectEnvironmentAction } from "../environment/rx-connect-environment.actions";
import { IRxConnectControllerUnsubscribeAction, RxConnectControllerAction  } from "./rx-connect-controller.actions";

export class RxConnectController extends ConnectController {    

    /** List of action ids that can subscribe to */
    private readonly canSubscribedList = new Set<number>();
     /** {actionId: Subscriber} */
    private readonly subscribersMap = new Map<number, Subscriber<IConnectCustomAction>>();

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
        action:
            | IConnectEnvironmentActions
            | IRxConnectEnvironmentActions
    ): void {
        switch (action.type) {
            case RxConnectEnvironmentAction.RX_INIT:
                this.runnerObservableInit(action as IRxConnectEnvironmentInitAction);
                break;
            case RxConnectEnvironmentAction.RX_EMIT:
                this.runnerObservableEmit(action as IRxConnectEnvironmentEmitAction);
                break;
            case RxConnectEnvironmentAction.RX_ERROR:
                this.runnerObservableError(action as IRxConnectEnvironmentErrorAction);
                break;
            case RxConnectEnvironmentAction.RX_COMPLETED:
                this.runnerObservableCompleted(action as IRxConnectEnvironmentCompletedAction);
                break;
            case RxConnectEnvironmentAction.RX_NOT_FOUND:
                this.runnerObservableNotFound(action as IRxConnectEnvironmentNotFoundAction);
                break;
            default:
                super.handleAction(action);
                break;
        }
    }

    private runnerObservableInit(action: IRxConnectEnvironmentInitAction): void {
        const observable = new Observable<IConnectCustomAction>(subscriber => {
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
        }).pipe(share());
        this.canSubscribedList.add(action.id);
        const responseAction: IConnectEnvironmentCustomResponseAction = {
            id: action.id,
            type: ConnectEnvironmentAction.CUSTOM_RESPONSE,
            // Types hack :(
            payload: observable as unknown as IConnectCustomAction,
        }
        this.promiseListResolver.resolve(action.id, responseAction);
    }

    private runnerObservableEmit(action: IRxConnectEnvironmentEmitAction): void {
        this.getSubscriber(action.id).next(action.response);
    }

    private runnerObservableError(action: IRxConnectEnvironmentErrorAction): void {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        this.getSubscriber(action.id).error(
            this.errorSerializer.deserialize(action.error)
        );
    }

    private runnerObservableCompleted(action: IRxConnectEnvironmentCompletedAction): void {
        this.getSubscriber(action.id).complete();
        this.subscribersMap.delete(action.id);
    }

    private runnerObservableNotFound(action: IRxConnectEnvironmentNotFoundAction): void {
        const subscriber =  this.getSubscriber(action.id);
        subscriber.error(new RxSubscriptionNotFoundError()); // TODO NEED TEST
        subscriber.complete();
        this.subscribersMap.delete(action.id);
    }

    private getSubscriber(actionId: number): Subscriber<IConnectCustomAction> {
        const completedSubscriber$ = this.subscribersMap.get(actionId);
        if (!completedSubscriber$) {
            throw new RxSubscriptionNotFoundError();
        }
        return completedSubscriber$;
    }
}
