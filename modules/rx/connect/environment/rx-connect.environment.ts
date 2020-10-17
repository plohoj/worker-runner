import { ConnectEnvironment, IConnectControllerActions, IConnectEnvironmentAction, IConnectEnvironmentActions, IMessagePortConnectEnvironmentData, JsonObject, TransferableJsonObject, WorkerRunnerUnexpectedError, IListeningInterrupter, LISTENING_INTERRUPT, ConnectionWasClosedError } from "@worker-runner/core";
import { from, Observable, Subscription } from "rxjs";
import { takeUntil, tap } from "rxjs/operators";
import { RxSubscriptionNotFoundError } from "../../errors/runner-errors";
import { IRxConnectControllerActions, RxConnectControllerAction } from "../controller/rx-connect-controller.actions";
import { IRxConnectEnvironmentActions, IRxConnectEnvironmentCompletedAction, IRxConnectEnvironmentEmitAction, IRxConnectEnvironmentErrorAction, IRxConnectEnvironmentInitAction, IRxConnectEnvironmentNotFoundAction, RxConnectEnvironmentAction } from "./rx-connect-environment.actions";

interface IRxListeningInterrupter extends IListeningInterrupter {
    observable: Observable<typeof LISTENING_INTERRUPT>;
}

interface IMessagePortRxConnectEnvironmentData extends IMessagePortConnectEnvironmentData{
    subscriptionsMap: Map<number, Subscription>;
    observablesMap: Map<number, Observable<Record<string, TransferableJsonObject>>>
    listeningInterrupter: IRxListeningInterrupter;
}

/** **WARNING**: Errors emits as is, need use pipe for serialize*/
export class RxConnectEnvironment extends ConnectEnvironment {
        
    declare protected sendAction: (
        port: MessagePort,
        action: IConnectEnvironmentActions | IRxConnectEnvironmentActions,
    ) => void;

    declare protected getMessagePortData: (port: MessagePort) => IMessagePortRxConnectEnvironmentData | undefined;

    protected async handleAction(
        port: MessagePort,
        actionWithId: IConnectEnvironmentAction | IConnectControllerActions | IRxConnectControllerActions
    ): Promise<void> {
        switch ((actionWithId as IRxConnectControllerActions).type) {
            case RxConnectControllerAction.RX_SUBSCRIBE:
                this.onSubscribeAction(port, actionWithId.id);
                break;
            case RxConnectControllerAction.RX_UNSUBSCRIBE:
                this.onUnsubscribeAction(port, actionWithId.id);
                break;
            default: 
                super.handleAction(port, actionWithId as IConnectEnvironmentAction | IConnectControllerActions)
        }
    }

    protected async handleCustomActionResponse (
        port: MessagePort,
        response: Record<string, TransferableJsonObject> | Observable<Record<string, TransferableJsonObject>>,
        actionId: number,
    ): Promise<void> {
        if (response instanceof Observable) {
            const portRxData = this.getMessagePortData(port);
            if (!portRxData) {
                throw new WorkerRunnerUnexpectedError({
                    message: 'The method result was received after the connection was closed',
                });
            }
            portRxData.observablesMap.set(actionId, response);
            const initObservableAction: IRxConnectEnvironmentInitAction = {
                id: actionId,
                type: RxConnectEnvironmentAction.RX_INIT,
            }
            this.sendAction(port, initObservableAction);
        } else {
            super.handleCustomActionResponse(port, response, actionId);
        }
    }

    protected createMessagePortData(port: MessagePort, data: IMessagePortRxConnectEnvironmentData): void {
        const portData: IMessagePortRxConnectEnvironmentData = {
            ...data,
            observablesMap: new Map(),
            subscriptionsMap: new Map(),
        };
        super.createMessagePortData(port, portData);
    }

    protected listeningInterrupterFactory(): IRxListeningInterrupter {
        const parentListeningInterrupter = super.listeningInterrupterFactory()
        return {
            ...parentListeningInterrupter,
            observable: from(parentListeningInterrupter.promise),
        };
    }

    private pipeObservable(port: MessagePort, actionId: number): Observable<Record<string, TransferableJsonObject>> | undefined {
        const portRxData = this.getMessagePortData(port);
        if (!portRxData) {
            return;
        }
        const observable = portRxData.observablesMap.get(actionId);
        if (!observable) {
            return;
        }
        portRxData.observablesMap.delete(actionId);
        return observable
    }

    private onSubscribeAction(
        port: MessagePort,
        actionId: number,
    ): void {
        const observable = this.pipeObservable(port, actionId);
        if (!observable) {
            const notFoundAction: IRxConnectEnvironmentNotFoundAction = {
                id: actionId,
                type: RxConnectEnvironmentAction.RX_NOT_FOUND,
            };
            this.sendAction(port, notFoundAction);
            return;
        }
        const portRxData = this.getMessagePortData(port);
        if (!portRxData) {
            throw new ConnectionWasClosedError();
        }
        let isListeningInterrupted = false;
        const subscription = observable
            .pipe(
                takeUntil(portRxData.listeningInterrupter.observable.pipe(
                    tap(() => isListeningInterrupted = true)
                ))
            ).subscribe({
                next: this.onObservableEmit.bind(this, port, actionId),
                error: this.onObservableError.bind(this, port, actionId),
                complete: () => {
                    if (!isListeningInterrupted) {
                        this.onObservableComplete(port, actionId);
                    }
                },
            });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.getMessagePortData(port)!.subscriptionsMap.set(actionId, subscription);
    }

    private onObservableEmit(
        port: MessagePort,
        actionId: number,
        data: Record<string, TransferableJsonObject>
    ): void {
        const {transfer, ...dataWithoutTransfer} = data
        const emitAction: IRxConnectEnvironmentEmitAction = {
            response: dataWithoutTransfer,
            id: actionId,
            type: RxConnectEnvironmentAction.RX_EMIT,
            transfer: transfer as Transferable[],
        }
        this.sendAction(port, emitAction);
    }

    private onObservableError(
        port: MessagePort,
        actionId: number,
        error: Record<string, JsonObject>,
    ): void {
        const errorAction: IRxConnectEnvironmentErrorAction = {
            error,
            id: actionId,
            type: RxConnectEnvironmentAction.RX_ERROR,
        }
        this.sendAction(port, errorAction);
    }

    private onObservableComplete(port: MessagePort, actionId: number): void {
        const completeAction: IRxConnectEnvironmentCompletedAction = {
            id: actionId,
            type: RxConnectEnvironmentAction.RX_COMPLETED,
        }
        this.sendAction(port, completeAction);
    }

    private onUnsubscribeAction(port: MessagePort, actionId: number): void {
        const portRxData = this.getMessagePortData(port)
        const subscription = portRxData?.subscriptionsMap.get(actionId);
        if (!subscription) {
            throw new RxSubscriptionNotFoundError();
        }
        subscription.unsubscribe();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        portRxData!.subscriptionsMap.delete(actionId);
    }
}
