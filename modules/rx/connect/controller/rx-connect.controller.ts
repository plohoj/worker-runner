import { ConnectController, IConnectEnvironmentAction, IConnectEnvironmentActions, PromisesResolver, ConnectionWasClosedError, WorkerRunnerUnexpectedError } from "@worker-runner/core";
import { Observable, Subscriber } from "rxjs";
import { publish, refCount } from "rxjs/operators";
import { RxSubscriptionNotFoundError } from "../../errors/runner-errors";
import { IRxConnectEnvironmentActionPropertiesRequirements, IRxConnectEnvironmentActions, IRxConnectEnvironmentCompletedAction, IRxConnectEnvironmentEmitAction, IRxConnectEnvironmentErrorAction, IRxConnectEnvironmentForceUnsubscribedAction, IRxConnectEnvironmentInitAction, IRxConnectEnvironmentNotFoundAction, RxConnectEnvironmentAction } from "../environment/rx-connect-environment.actions";
import { IRxConnectControllerActionPropertiesRequirements, IRxConnectControllerUnsubscribeAction, RxConnectControllerAction  } from "./rx-connect-controller.actions";

/** **WARNING**: Errors emits as is, need use pipe */
export class RxConnectController extends ConnectController {
    /** {actionId: Subscriber} */
    public readonly subscribersMap = new Map<number, Subscriber<IConnectEnvironmentAction>>();
    
    declare public sendAction: <
        O extends IRxConnectControllerActionPropertiesRequirements<O>,
        I extends IRxConnectEnvironmentActionPropertiesRequirements<I>
            | Observable<IRxConnectEnvironmentActionPropertiesRequirements<I>>,
    >(action: O) => Promise<I>;

    declare protected readonly promiseResolver: PromisesResolver<IConnectEnvironmentAction | Observable<IConnectEnvironmentAction>>;
    /** List of action ids that can subscribe to */
    private readonly canSubscribedList = new Set<number>();

    public stopListen(): void {
        this.disconnectStatus ||= this.disconnectErrorFactory(new ConnectionWasClosedError());
        // TODO notify environment about unsubscribe all
        this.subscribersMap.forEach(subscriber => {
            subscriber.error(this.disconnectStatus);
            subscriber.complete();
        });
        this.subscribersMap.clear();
        super.stopListen();
    }

    protected handleAction(
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
            case RxConnectEnvironmentAction.RX_FORCE_UNSUBSCRIBED:
                this.runnerObservableForceUnsubscribed(actionWithId as IRxConnectEnvironmentForceUnsubscribedAction);
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
            this.port.postMessage({
                type: RxConnectControllerAction.RX_SUBSCRIBE,
                id: action.id,
            })
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
        this.promiseResolver.resolve(
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

    private runnerObservableForceUnsubscribed(action: IRxConnectEnvironmentForceUnsubscribedAction): void {
        if (this.canSubscribedList.has(action.id)) {
            this.canSubscribedList.delete(action.id);
            return;
        }
        const subscriber =  this.getSubscriber(action.id);
        subscriber.error(new Error()) // TODO
        subscriber.complete();
        this.subscribersMap.delete(action.id);
    }

    private runnerObservableNotFound(action: IRxConnectEnvironmentNotFoundAction): void {
        const subscriber =  this.getSubscriber(action.id);
        subscriber.error(new Error()) // TODO
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
