import { ConnectEnvironment, IConnectControllerActions, IConnectEnvironmentActions, IMessagePortConnectEnvironmentData, WorkerRunnerUnexpectedError, IListeningInterrupter, ConnectionWasClosedError, IConnectCustomAction } from "@worker-runner/core";
import { from, Observable, Subscription } from "rxjs";
import { takeUntil, tap } from "rxjs/operators";
import { RxRunnerEmitError, RxSubscriptionNotFoundError } from "../../errors/runner-errors";
import { IRxConnectControllerActions, RxConnectControllerAction } from "../controller/rx-connect-controller.actions";
import { IRxConnectEnvironmentActions, IRxConnectEnvironmentCompletedAction, IRxConnectEnvironmentEmitAction, IRxConnectEnvironmentErrorAction, IRxConnectEnvironmentInitAction, IRxConnectEnvironmentNotFoundAction, RxConnectEnvironmentAction } from "./rx-connect-environment.actions";

interface IRxListeningInterrupter extends IListeningInterrupter {
    observable: Observable<void>;
}

interface IMessagePortRxConnectEnvironmentData extends IMessagePortConnectEnvironmentData{
    subscriptionsMap: Map<number, Subscription>;
    observablesMap: Map<number, Observable<IConnectCustomAction>>
    listeningInterrupter: IRxListeningInterrupter;
}

export class RxConnectEnvironment<
    I extends IConnectCustomAction = IConnectCustomAction,
    O extends IConnectCustomAction = IConnectCustomAction
> extends ConnectEnvironment<I, O> {
        
    declare protected sendAction: (
        port: MessagePort,
        action: IConnectEnvironmentActions | IRxConnectEnvironmentActions,
        transfer?: Transferable[]
    ) => void;

    declare protected getMessagePortData: (port: MessagePort) => IMessagePortRxConnectEnvironmentData | undefined;

    protected override async handleAction(
        port: MessagePort,
        actionWithId: IConnectControllerActions | IRxConnectControllerActions
    ): Promise<void> {
        switch (actionWithId.type) {
            case RxConnectControllerAction.RX_SUBSCRIBE:
                this.onSubscribeAction(port, actionWithId.id);
                break;
            case RxConnectControllerAction.RX_UNSUBSCRIBE:
                this.onUnsubscribeAction(port, actionWithId.id);
                break;
            default: 
                super.handleAction(port, actionWithId)
        }
    }

    protected override async handleCustomActionResponse (
        port: MessagePort,
        response: O | Observable<O>,
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

    protected override createMessagePortData(port: MessagePort, data: IMessagePortRxConnectEnvironmentData): void {
        const portData: IMessagePortRxConnectEnvironmentData = {
            ...data,
            observablesMap: new Map(),
            subscriptionsMap: new Map(),
        };
        super.createMessagePortData(port, portData);
    }

    protected override buildListeningInterrupter(): IRxListeningInterrupter {
        const parentListeningInterrupter = super.buildListeningInterrupter()
        return {
            ...parentListeningInterrupter,
            observable: from(parentListeningInterrupter.promise),
        };
    }

    private extractObservable(port: MessagePort, actionId: number): Observable<IConnectCustomAction> | undefined {
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
        const observable = this.extractObservable(port, actionId);
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
        data: IConnectCustomAction
    ): void {
        const {transfer, ...dataWithoutTransfer} = data
        const emitAction: IRxConnectEnvironmentEmitAction = {
            response: dataWithoutTransfer,
            id: actionId,
            type: RxConnectEnvironmentAction.RX_EMIT,
        }
        this.sendAction(port, emitAction, transfer);
    }

    private onObservableError(
        port: MessagePort,
        actionId: number,
        error: unknown,
    ): void {
        const errorAction: IRxConnectEnvironmentErrorAction = {
            error: this.errorSerializer.serialize(
                this.errorSerializer.normalize(error, RxRunnerEmitError),
            ),
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
