import { ConnectEnvironment, IConnectControllerActions, IConnectEnvironmentAction, IConnectEnvironmentActions, JsonObject, TransferableJsonObject } from "@worker-runner/core";
import { Observable, Subscription } from "rxjs";
import { IRxConnectControllerActions, RxConnectControllerAction } from "../controller/rx-connect-controller.actions";
import { IRxConnectEnvironmentActions, IRxConnectEnvironmentCompletedAction, IRxConnectEnvironmentEmitAction, IRxConnectEnvironmentErrorAction, IRxConnectEnvironmentForceUnsubscribedAction, IRxConnectEnvironmentInitAction, IRxConnectEnvironmentNotFoundAction, RxConnectEnvironmentAction } from "./rx-connect-environment.actions";

interface IPortRxData {
    subscriptionsMap: Map<number, Subscription>;
    observablesMap: Map<number, Observable<Record<string, TransferableJsonObject>>>
}

/** **WARNING**: Errors emits as is, need use pipe */
export class RxConnectEnvironment extends ConnectEnvironment {
        
    declare protected sendAction: (
        port: MessagePort,
        action: IConnectEnvironmentActions | IRxConnectEnvironmentActions,
    ) => void;

    private readonly portRxDataMap = new Map<MessagePort, IPortRxData>();

    public addPorts(...ports: MessagePort[]): void {
        for (const port of ports) {
            this.portRxDataMap.set(port, {
                observablesMap: new Map(),
                subscriptionsMap: new Map(),
            });
        }
        super.addPorts(...ports);
    }

    protected async onDestroy(port: MessagePort, actionId: number): Promise<void> {
        for (const [key] of this.portRxDataMap) {
            this.forceDestroyObservablesForPort(key);
        }
        super.onDestroy(port, actionId);
    }

    protected onDisconnect(port: MessagePort, actionId: number): void {
        this.forceDestroyObservablesForPort(port);
        super.onDisconnect(port, actionId);
    }

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
            const portRxData = this.portRxDataMap.get(port);
            if (!portRxData) {
                throw new Error();
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
    
    private forceDestroyObservablesForPort(port: MessagePort): void {
        const protRxData = this.portRxDataMap.get(port);
        if (protRxData) {
            for (const [id, subscription] of protRxData.subscriptionsMap) {
                subscription.unsubscribe();
                const forceUnsubscribedAction: IRxConnectEnvironmentForceUnsubscribedAction = {
                    id,
                    type: RxConnectEnvironmentAction.RX_FORCE_UNSUBSCRIBED,
                };
                this.sendAction(port, forceUnsubscribedAction)
            }
            for (const [id] of protRxData.observablesMap) {
                const forceUnsubscribedAction: IRxConnectEnvironmentForceUnsubscribedAction = {
                    id,
                    type: RxConnectEnvironmentAction.RX_FORCE_UNSUBSCRIBED,
                };
                this.sendAction(port, forceUnsubscribedAction)
            }
        }
        this.portRxDataMap.delete(port);
    }

    private pipeObservable(port: MessagePort, actionId: number): Observable<Record<string, TransferableJsonObject>> | undefined {
        const portRxData = this.portRxDataMap.get(port);
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
        const subscription = observable.subscribe({
            next: this.onObservableEmit.bind(this, port, actionId),
            error: this.onObservableError.bind(this, port, actionId),
            complete: this.onObservableComplete.bind(this, port, actionId),
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.portRxDataMap.get(port)!.subscriptionsMap.set(actionId, subscription);
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
        const portRxData = this.portRxDataMap.get(port)
        const subscription = portRxData?.subscriptionsMap.get(actionId);
        if (!subscription) {
            throw new Error();
        }
        subscription.unsubscribe();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        portRxData!.subscriptionsMap.delete(actionId);
    }
}
