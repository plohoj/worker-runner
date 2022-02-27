import { ConnectClient, IConnectHostActions, ConnectionWasClosedError, WorkerRunnerUnexpectedError, IConnectCustomAction, IConnectHostCustomResponseAction, ConnectHostAction } from "@worker-runner/core";
import { Observable, Subscriber } from "rxjs";
import { share, tap } from "rxjs/operators";
import { RxSubscriptionNotFoundError } from "../../errors/runner-errors";
import { IRxConnectHostActions, IRxConnectHostCompletedAction, IRxConnectHostEmitAction, IRxConnectHostErrorAction, IRxConnectHostInitAction, IRxConnectHostNotFoundAction, RxConnectHostAction } from "../host/rx-connect.host.actions";
import { IRxConnectClientSubscribeAction, IRxConnectClientUnsubscribeAction, RxConnectClientAction  } from "./rx-connect.client.actions";

export class RxConnectClient extends ConnectClient {    

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
            | IConnectHostActions
            | IRxConnectHostActions
    ): void {
        switch (action.type) {
            case RxConnectHostAction.RX_INIT:
                this.runnerObservableInit(action as IRxConnectHostInitAction);
                break;
            case RxConnectHostAction.RX_EMIT:
                this.runnerObservableEmit(action as IRxConnectHostEmitAction);
                break;
            case RxConnectHostAction.RX_ERROR:
                this.runnerObservableError(action as IRxConnectHostErrorAction);
                break;
            case RxConnectHostAction.RX_COMPLETED:
                this.runnerObservableCompleted(action as IRxConnectHostCompletedAction);
                break;
            case RxConnectHostAction.RX_NOT_FOUND:
                this.runnerObservableNotFound(action as IRxConnectHostNotFoundAction);
                break;
            default:
                super.handleAction(action);
                break;
        }
    }

    private runnerObservableInit(action: IRxConnectHostInitAction): void {
        let isComplete = false;
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
            this.canSubscribedList.delete(action.id);
            const subscribeAction: IRxConnectClientSubscribeAction = {
                type: RxConnectClientAction.RX_SUBSCRIBE,
                id: action.id,
            };
            this.port.postMessage(subscribeAction);
            return () => {
                // TODO NEED TEST
                if (!isComplete) {
                    const unsubscribeAction: IRxConnectClientUnsubscribeAction = {
                        type: RxConnectClientAction.RX_UNSUBSCRIBE,
                        id: action.id,
                    }
                    this.port.postMessage(unsubscribeAction);
                }
            };
        }).pipe(
            tap({ complete: () => isComplete = true }),
            share(),
        );
        this.canSubscribedList.add(action.id);
        const responseAction: IConnectHostCustomResponseAction = {
            id: action.id,
            type: ConnectHostAction.CUSTOM_RESPONSE,
            // Types hack :(
            payload: observable as unknown as IConnectCustomAction,
        }
        this.promiseListResolver.resolve(action.id, responseAction);
    }

    private runnerObservableEmit(action: IRxConnectHostEmitAction): void {
        this.getSubscriber(action.id).next(action.response);
    }

    private runnerObservableError(action: IRxConnectHostErrorAction): void {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        this.getSubscriber(action.id).error(
            this.errorSerializer.deserialize(action.error)
        );
    }

    private runnerObservableCompleted(action: IRxConnectHostCompletedAction): void {
        this.getSubscriber(action.id).complete();
        this.subscribersMap.delete(action.id);
    }

    private runnerObservableNotFound(action: IRxConnectHostNotFoundAction): void {
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
