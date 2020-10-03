import { PromisesResolver } from "../../utils/runner-promises";
import { ConnectEnvironmentAction, IConnectEnvironmentAction, IConnectEnvironmentActionPropertiesRequirements, IConnectEnvironmentActions, IConnectEnvironmentDestroyedWithErrorAction } from "../environment/connect-environment.actions";
import { IConnectControllerErrorDeserializer } from "./connect-controller-error-deserializer";
import { ConnectControllerAction, IConnectControllerAction, IConnectControllerActionPropertiesRequirements, IConnectControllerDestroyAction, IConnectControllerDisconnectAction,  } from "./connect-controller.actions";

export interface IConnectControllerConfig {
    port: MessagePort,
    forceDestroyHandler?: () => void;
    errorDeserializer: IConnectControllerErrorDeserializer;
}

export class ConnectController {
    public readonly port: MessagePort;
    protected readonly promiseResolver = new PromisesResolver<IConnectEnvironmentAction>();

    private readonly messageHandler = this.onMessage.bind(this);
    private readonly forceDestroyHandler?: () => void;
    private readonly errorDeserializer: IConnectControllerErrorDeserializer;
    private lastActionId = 0; // TODO store in port, because after transfer controller, actionId may match
    private disconnectStatus?: Error; // TODO

    constructor(config: IConnectControllerConfig) {
        this.forceDestroyHandler = config.forceDestroyHandler;
        this.errorDeserializer = config.errorDeserializer;
        this.port = config.port;
        this.port.addEventListener('message', this.messageHandler);
        this.port.start();
    }

    public async destroy(): Promise<void> {
        const destroyAction: IConnectControllerDestroyAction = {
            id: this.resolveActionId(),
            type: ConnectControllerAction.DESTROY,
        };
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await this.sendAction(destroyAction as any);
        } finally {
            this.stopListen();
        }
    }

    public async disconnect(): Promise<void> {
        const disconnectAction: Omit<IConnectControllerDisconnectAction, 'id'> = {
            type: ConnectControllerAction.DISCONNECT,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.sendAction(disconnectAction as any);
        this.stopListen();
    }

    public sendAction<
        O extends IConnectControllerActionPropertiesRequirements<O>,
        I extends IConnectEnvironmentActionPropertiesRequirements<I>,
    >(action: O): Promise<I> {
        if (this.disconnectStatus) {
            throw this.disconnectStatus;
        }
        const actionId = this.resolveActionId();
        const {transfer, ...actionWithoutTransfer} = action; 
        const actionWidthId: IConnectControllerAction & O = {
            ...actionWithoutTransfer as O,
            id: actionId,
        };
        const response$ = this.promiseResolver.promise(actionId);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.port.postMessage(actionWidthId, transfer!);
        return response$ as unknown as Promise<I>;
    }

    public get isConnected(): boolean {
        return !this.disconnectStatus;
    }

    /** Stop listening on the port without notifying *ConnectEnvironment* */
    public stopListen(isClosePort = true): void {
        // TODO notify all promises about disconnect / destroy
        // TODO notify environment about stop listen action result
        this.disconnectStatus ||= new Error(); // TODO
        this.port.removeEventListener('message', this.messageHandler);
        if (isClosePort) {
            this.port.close();
        }
    }

    protected handleAction(actionWithId: IConnectEnvironmentAction | IConnectEnvironmentActions): void {
        switch ((actionWithId as IConnectEnvironmentActions).type) {
            case ConnectEnvironmentAction.DESTROYED_BY_FORCE:
                this.stopListen();
                this.forceDestroyHandler?.();
                break;
            case ConnectEnvironmentAction.DESTROYED_WITH_ERROR: {
                const error = this.errorDeserializer(
                    (actionWithId as IConnectEnvironmentDestroyedWithErrorAction).error
                );
                this.promiseResolver.reject((actionWithId as IConnectEnvironmentAction).id, error);
                break;
            }
            default: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const {id, ...action} = actionWithId as any;
                this.promiseResolver.resolve(id, action);
                break;
            }
        }
    }

    private onMessage(event: MessageEvent<IConnectEnvironmentAction | IConnectEnvironmentActions>): void {
        this.handleAction(event.data);
    }

    private resolveActionId(): number {
        return this.lastActionId++;
    }
}
